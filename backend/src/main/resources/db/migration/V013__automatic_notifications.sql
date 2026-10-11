CREATE FUNCTION notify_invoice_issue() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'ISSUED' AND OLD.status <> 'ISSUED' THEN
        INSERT INTO notifications (user_id, event_key, type, title, message, resource_type, resource_id)
        SELECT t.user_id, 'INVOICE_ISSUE-' || NEW.id, 'INVOICE_ISSUED', 'Hóa đơn đã phát hành',
               'Hóa đơn kỳ ' || NEW.billing_month || ' đã được phát hành.', 'INVOICE', NEW.id
        FROM contracts c JOIN tenant_profiles t ON t.id = c.representative_tenant_id JOIN users u ON u.id = t.user_id
        WHERE c.id = NEW.contract_id AND u.enabled
        ON CONFLICT (user_id, event_key) DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_invoice_issue AFTER UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION notify_invoice_issue();

CREATE FUNCTION notify_invoice_adjustment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notifications (user_id, event_key, type, title, message, resource_type, resource_id)
    SELECT t.user_id, 'INVOICE_ADJUST-' || NEW.id, 'INVOICE_ADJUSTED', 'Hóa đơn có điều chỉnh',
           'Hóa đơn kỳ ' || i.billing_month || ' có điều chỉnh. Mở chi tiết để xem lý do.', 'INVOICE', i.id
    FROM invoices i JOIN contracts c ON c.id = i.contract_id JOIN tenant_profiles t ON t.id = c.representative_tenant_id
    JOIN users u ON u.id = t.user_id WHERE i.id = NEW.invoice_id AND u.enabled
    ON CONFLICT (user_id, event_key) DO NOTHING;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_invoice_adjustment AFTER INSERT ON invoice_adjustments FOR EACH ROW EXECUTE FUNCTION notify_invoice_adjustment();

CREATE FUNCTION notify_issue_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO notifications (user_id, event_key, type, title, message, resource_type, resource_id)
    SELECT DISTINCT u.id, 'ISSUE-' || NEW.id || '-' || NEW.version, 'ISSUE_UPDATED', 'Cập nhật sự cố',
           'Sự cố: ' || NEW.title || '. Trạng thái: ' || NEW.status, 'ISSUE', NEW.id
    FROM users u CROSS JOIN contracts c JOIN rooms r ON r.id = c.room_id JOIN tenant_profiles t ON t.id = c.representative_tenant_id
    WHERE c.id = NEW.contract_id AND u.enabled AND
          (u.id = t.user_id OR u.id = NEW.assignee_id OR u.role = 'OWNER' OR
           (u.role = 'STAFF' AND EXISTS (SELECT 1 FROM building_staff_assignments a WHERE a.user_id = u.id AND a.building_id = r.building_id)))
    ON CONFLICT (user_id, event_key) DO NOTHING;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_issue_change AFTER INSERT OR UPDATE ON maintenance_issues FOR EACH ROW EXECUTE FUNCTION notify_issue_change();
