"""Backup database + private images, restore only into an empty database/directory.

Requires Python 3 and PostgreSQL client tools of the server's major version.
Connection parameters use PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE or .pgpass.
Stop the API (including scheduled jobs) before backup and keep the restore target offline.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
from datetime import datetime, timezone


def pg(args, tool, *params, capture=False):
    binary = str(Path(args.pg_bin) / tool) if args.pg_bin else tool
    result = subprocess.run([binary, *params], check=True, stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.PIPE, env=os.environ.copy())
    return result.stdout.decode('utf-8').strip() if capture else None


def sql(args, statement):
    return pg(args, 'psql', '-X', '-v', 'ON_ERROR_STOP=1', '-A', '-t', '-c', statement, capture=True)


def digest(path):
    value = hashlib.sha256()
    with path.open('rb') as source:
        for block in iter(lambda: source.read(1024 * 1024), b''):
            value.update(block)
    return value.hexdigest()


def hashes(directory):
    result = {}
    for path in sorted(directory.rglob('*')):
        if path.is_symlink():
            raise ValueError('Storage/backup must not contain symbolic links')
        if path.is_file():
            result[path.relative_to(directory).as_posix()] = digest(path)
    return result


def snapshot(args):
    tables = sql(args, "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
    counts = {}
    for name in tables:
        if not re.fullmatch(r'[a-zA-Z0-9_]+', name):
            raise ValueError('Unsupported table identifier')
        counts[name] = int(sql(args, f'SELECT count(*) FROM public."{name}"'))
    totals = {}
    for table, column in [('invoice_items', 'amount'), ('invoice_adjustments', 'delta_amount'),
                          ('invoice_ledger_entries', 'amount'), ('deposit_ledger_entries', 'amount')]:
        if table in counts:
            totals[table] = sql(args, f'SELECT coalesce(sum({column}),0)::text FROM public.{table}')
    return {'rows': counts, 'moneyTotals': totals}


def backup(args):
    storage = Path(args.storage).resolve(strict=True)
    destination = Path(args.backup).resolve()
    if not storage.is_dir() or destination == storage or storage in destination.parents or destination in storage.parents:
        raise ValueError('Backup and storage directories must be separate')
    if destination.exists():
        raise ValueError('Backup path already exists; choose a new path')
    before = snapshot(args)
    original_images = hashes(storage)
    destination.mkdir(parents=True)
    pg(args, 'pg_dump', '--format=custom', '--no-owner', '--no-privileges', '--file', str(destination / 'database.dump'))
    shutil.copytree(storage, destination / 'uploads', symlinks=False)
    after = snapshot(args)
    if before != after or original_images != hashes(storage) or original_images != hashes(destination / 'uploads'):
        raise ValueError('Database/files changed during backup. Keep API/jobs stopped and take a new backup')
    manifest = {'format': 1, 'createdAt': datetime.now(timezone.utc).isoformat(),
                'database': before, 'dumpSha256': digest(destination / 'database.dump'),
                'images': hashes(destination / 'uploads')}
    (destination / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    print(f'BACKUP PASS: {len(before["rows"])} tables, {len(manifest["images"])} files. {destination}')


def restore(args):
    source = Path(args.backup).resolve(strict=True)
    storage = Path(args.storage).resolve()
    if storage == source or source in storage.parents or storage in source.parents:
        raise ValueError('Restore storage must be separate from backup')
    manifest = json.loads((source / 'manifest.json').read_text(encoding='utf-8'))
    if manifest.get('format') != 1 or digest(source / 'database.dump') != manifest['dumpSha256']:
        raise ValueError('Invalid backup/dump checksum')
    if hashes(source / 'uploads') != manifest['images']:
        raise ValueError('Missing/changed backup image')
    if sql(args, "SELECT count(*) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')") != '0':
        raise ValueError('Restore requires an empty database; existing data will not be overwritten')
    if storage.exists() and (not storage.is_dir() or any(storage.iterdir())):
        raise ValueError('Restore requires an empty storage directory')
    storage.mkdir(parents=True, exist_ok=True)
    pg(args, 'pg_restore', '--dbname', os.environ.get('PGDATABASE', ''), '--exit-on-error', '--single-transaction',
       '--no-owner', '--no-privileges', str(source / 'database.dump'))
    shutil.copytree(source / 'uploads', storage, dirs_exist_ok=True)
    if snapshot(args) != manifest['database'] or hashes(storage) != manifest['images']:
        raise ValueError('Restore reconciliation failed; leave the restored API offline')
    print(f'RESTORE PASS: row counts, invoice/deposit ledger totals and {len(manifest["images"])} file checksums match')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['backup', 'restore'])
    parser.add_argument('--backup', required=True, help='New backup directory, or source directory for restore')
    parser.add_argument('--storage', required=True, help='Actual trohub.storage.location directory')
    parser.add_argument('--pg-bin', default='', help='PostgreSQL bin directory if client tools are not on PATH')
    parser.add_argument('--api-stopped', action='store_true', help='Confirm API and background writers are stopped')
    args = parser.parse_args()
    if not args.api_stopped or not os.environ.get('PGDATABASE'):
        parser.error('--api-stopped and explicit PGDATABASE are required')
    try:
        (backup if args.action == 'backup' else restore)(args)
    except subprocess.CalledProcessError as ex:
        # Do not print connection arguments or environment credentials.
        raise SystemExit(f'PostgreSQL {Path(ex.cmd[0]).name} failed (exit {ex.returncode}); backup/restore incomplete')
    except (OSError, ValueError, KeyError) as ex:
        raise SystemExit(str(ex))


if __name__ == '__main__':
    main()
