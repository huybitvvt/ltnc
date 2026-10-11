import { test, expect, Page, APIRequestContext } from '@playwright/test';

const api = process.env.E2E_API_URL ?? 'http://127.0.0.1:8080/api/v1';
const ownerLogin = process.env.E2E_OWNER_LOGIN;
const ownerPassword = process.env.E2E_OWNER_PASSWORD;
if (!ownerLogin || !ownerPassword) throw new Error('Provide E2E_OWNER_LOGIN and E2E_OWNER_PASSWORD for an isolated test database');
const password = 'E2eFixture@2026';
let owner: APIRequestContext;
let building: any, otherBuilding: any, staff: any, contract: any, tenantLogin: string, invoice: any;
const marker = 'e2e_' + Date.now();
const now = new Date();
const start = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1)).toISOString().slice(0,10);
const end = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)).toISOString().slice(0,10);

async function command(client: APIRequestContext, path: string, data: unknown, method = 'post') {
  const response = await client.fetch(api+path,{method,data,headers:{'X-Idempotency-Key': marker+'_'+path.replace(/\W/g,'_')}});
  expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy();
  return (await response.json()).data;
}
async function login(page: Page, loginId: string, secret: string) {
  await page.goto('/login');
  await page.getByLabel('Tên đăng nhập / Số điện thoại').fill(loginId);
  await page.getByLabel(/^Mật khẩu/).fill(secret);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();
  await expect(page).not.toHaveURL(/\/login$/);
}
test.beforeAll(async ({playwright}) => {
  const bootstrap = await playwright.request.newContext();
  const result = await command(bootstrap,'/auth/mobile/login',{login:ownerLogin,password:ownerPassword});
  owner = await playwright.request.newContext({extraHTTPHeaders:{Authorization:'Bearer '+result.accessToken}});
  await bootstrap.dispose();
  building = await command(owner,'/buildings',{name:marker+'_assigned',address:'Synthetic fixture'});
  otherBuilding = await command(owner,'/buildings',{name:marker+'_private',address:'Synthetic fixture'});
  staff = await command(owner,'/users',{login:marker+'_staff',buildingIds:[building.id]});
  await command(owner,'/auth/activate',{inviteCode:staff.inviteCode,password});
  const room = await command(owner,`/buildings/${building.id}/rooms`,{roomNumber:'101',basePrice:'3000000',depositAmount:'3000000',maxTenants:2,bookable:true});
  const profile = await command(owner,'/tenants',{fullName:marker+'_tenant',phone:String(Date.now()).slice(-10),citizenId:'000000001234'});
  contract = await command(owner,'/contracts',{roomId:room.id,representativeTenantId:profile.id,actualStartDate:start,plannedEndExclusive:'2030-01-01',rent:'3000000',depositRequired:'3000000'});
  const invitation = await command(owner,`/tenants/${profile.id}/invite`,{});
  await command(owner,'/auth/activate',{inviteCode:invitation.inviteCode,password});
  tenantLogin=profile.phone;
  await command(owner,`/contracts/${contract.id}/activate`,{handoverReadings:['ELECTRICITY','WATER'].map(meterType=>({meterType,readingDate:start,value:'0'}))});
  const meterResponse=await owner.get(api+`/rooms/${room.id}/meters`);
  expect(meterResponse.ok()).toBeTruthy();
  for(const meter of (await meterResponse.json()).data)
    await command(owner,'/meters/readings',{meterId:meter.id,readingDate:end,value:'0'});
  for (const [name,unit] of [['Điện','kWh'],['Nước','m³']]) {
    const service=await command(owner,'/services',{name:name+' '+marker,unit,calculationType:'METERED'});
    await command(owner,`/buildings/${building.id}/tariffs`,{serviceId:service.id,effectiveMonth:start.slice(0,7),unitPrice:'1000'});
  }
  invoice=await command(owner,'/invoices/draft',{contractId:contract.id,billingMonth:start.slice(0,7)});
  invoice=await command(owner,`/invoices/${invoice.id}/issue`,{});
});
test.afterAll(async()=>{await owner?.dispose();});

test('OWNER can read the staff page and restore the session on reload',async({page})=>{
  await login(page,ownerLogin!,ownerPassword!);
  await page.goto('/users');
  await expect(page.getByText(staff.login,{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByText(staff.login,{exact:true})).toBeVisible();
  await expect(page).toHaveURL(/\/users$/);
});
test('STAFF sees assigned buildings and API rejects another building',async({page,request})=>{
  await login(page,staff.login,password);
  await page.goto('/buildings');
  await expect(page.getByText(building.name,{exact:true})).toBeVisible();
  await expect(page.getByText(otherBuilding.name,{exact:true})).toHaveCount(0);
  const token=await command(request,'/auth/mobile/login',{login:staff.login,password});
  const forbidden=await request.get(api+`/buildings/${otherBuilding.id}`,{headers:{Authorization:'Bearer '+token.accessToken}});
  expect(forbidden.status()).toBe(403);
});
test('TENANT sees own issued invoice and cannot open owner user management',async({page,request})=>{
  await login(page,tenantLogin,password);
  await page.goto('/invoices');
  await page.getByLabel('Kỳ tính tiền (YYYY-MM)',{exact:true}).fill(start.slice(0,7));
  await expect(page.getByText(building.name,{exact:true}).first()).toBeVisible();
  await page.goto('/users');
  await expect(page.getByRole('heading',{name:'403 - Không có quyền truy cập'})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Quản lý Nhân viên'})).toHaveCount(0);
  const token=await command(request,'/auth/mobile/login',{login:tenantLogin,password});
  const forbidden=await request.post(api+'/payments/record',{data:{invoiceId:invoice.id,amount:'1',paymentMethod:'CASH'},headers:{Authorization:'Bearer '+token.accessToken,'X-Idempotency-Key':marker+'_tenant_illegal'}});
  expect(forbidden.status()).toBe(403);
});

test('a lost payment response can be retried after reload without another receipt',async({page})=>{
  await login(page,ownerLogin!,ownerPassword!);
  await page.goto('/invoices');
  await page.getByLabel('Kỳ tính tiền (YYYY-MM)',{exact:true}).fill(start.slice(0,7));
  const row=page.getByRole('row').filter({hasText:building.name});
  await row.getByRole('button',{name:'Thu tiền nhanh'}).click();
  await page.getByLabel('Số tiền thu (VND) *',{exact:true}).fill('1000000');
  let requests=0;
  const keys:string[]=[];
  await page.route('**/api/v1/payments/record',async route=>{
    keys.push(route.request().headers()['x-idempotency-key']);
    if(requests++===0){const response=await route.fetch();expect(response.ok()).toBeTruthy();await route.abort('failed');}
    else await route.continue();
  });
  page.on('dialog',dialog=>dialog.dismiss());
  const submit=page.getByRole('button',{name:'Xác Nhận Thu Tiền',exact:true});
  await submit.click();
  await expect.poll(()=>requests).toBe(1);
  await expect(submit).toBeEnabled();
  await page.reload();
  await page.getByLabel('Kỳ tính tiền (YYYY-MM)',{exact:true}).fill(start.slice(0,7));
  await row.getByRole('button',{name:'Thu tiền nhanh'}).click();
  await page.getByLabel('Số tiền thu (VND) *',{exact:true}).fill('1000000');
  await submit.click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  const response=await owner.get(api+`/invoices/${invoice.id}/financial-status`);
  expect(response.ok()).toBeTruthy();
  const status=(await response.json()).data;
  expect(status.netApplied).toBe('1000000');
  expect(status.entries.filter((entry:any)=>entry.entryType==='PAYMENT')).toHaveLength(1);
});

test('checkout retries once and opens the final invoice before deposit reconciliation',async({page})=>{
  await login(page,ownerLogin!,ownerPassword!);
  await page.goto('/contracts');
  const row=page.getByRole('row').filter({hasText:building.name});
  await row.getByRole('button',{name:'Chi tiết & Sổ cọc'}).click();
  await page.getByRole('button',{name:'Trả Phòng & Kiểm Kê (Checkout)',exact:true}).click();
  const checkoutDate=new Date(Date.now()+7*60*60*1000).toISOString().slice(0,10);
  await page.getByLabel('Ngày trả phòng thực tế (Không tính tiền ngày này - BR-036) *',{exact:true}).fill(checkoutDate);
  await page.getByLabel('Chỉ số Điện chốt trả phòng (kWh) *',{exact:true}).fill('10');
  await page.getByLabel('Chỉ số Nước chốt trả phòng (m³) *',{exact:true}).fill('1');
  let requests=0; const keys:string[]=[];
  await page.route(`**/api/v1/contracts/${contract.id}/checkout`,async route=>{
    keys.push(route.request().headers()['x-idempotency-key']);
    if(requests++===0){const response=await route.fetch();expect(response.ok()).toBeTruthy();await route.abort('failed');}
    else await route.continue();
  });
  page.on('dialog',dialog=>dialog.dismiss());
  const submit=page.getByRole('button',{name:'Xác Nhận Trả Phòng',exact:true});
  await submit.click(); await expect.poll(()=>requests).toBe(1); await expect(submit).toBeEnabled(); await submit.click();
  const final=page.getByRole('dialog').filter({hasText:'Bước 2/3: Hóa đơn cuối'});
  await expect(final).toBeVisible(); expect(keys[0]).toBe(keys[1]);
  await final.getByRole('button',{name:'Xem trước hóa đơn cuối',exact:true}).click();
  await expect(final.getByText('Bản nháp',{exact:false})).toBeVisible();
  await final.getByRole('button',{name:'Phát hành hóa đơn cuối',exact:true}).click();
  await expect(final.getByText('Đã phát hành',{exact:false})).toBeVisible();
  const list=await owner.get(api+'/invoices',{params:{contractId:contract.id,billingMonth:checkoutDate.slice(0,7)}});
  expect(list.ok()).toBeTruthy(); const issued=(await list.json()).data.content;
  expect(issued).toHaveLength(1); expect(issued[0].status).toBe('ISSUED');
  const detail=await owner.get(api+`/invoices/${issued[0].id}`);
  expect((await detail.json()).data.periodEndExclusive).toBe(checkoutDate);
  await final.getByRole('button',{name:'Bước 3: Đối chiếu cọc',exact:true}).click();
  await expect(final).toHaveCount(0);
  await expect(page.getByRole('tab',{name:/Quản lý Cọc & Quyết Toán/})).toHaveAttribute('aria-selected','true');
});
