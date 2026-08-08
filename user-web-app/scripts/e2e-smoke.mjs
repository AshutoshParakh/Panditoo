import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const WEB_PORT=5176,API_PORT=4100,webUrl=`http://127.0.0.1:${WEB_PORT}`,apiUrl=`http://127.0.0.1:${API_PORT}/api`;
const edgePath="C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const poojaId="11111111-1111-4111-8111-111111111111",panditId="22222222-2222-4222-8222-222222222222",userId="33333333-3333-4333-8333-333333333333";
let bookingCreated=false,profileName="Ritika Sharma";
const json=(res,status,body)=>{res.writeHead(status,{"Content-Type":"application/json","Access-Control-Allow-Origin":webUrl,"Access-Control-Allow-Headers":"Content-Type, Authorization","Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS"});res.end(JSON.stringify(body));};
const readBody=req=>new Promise(resolve=>{let raw="";req.on("data",c=>raw+=c);req.on("end",()=>{try{resolve(raw?JSON.parse(raw):{});}catch{resolve({});}});});

const mockApi=http.createServer(async(req,res)=>{
  if(req.method==="OPTIONS")return json(res,204,{});
  const path=new URL(req.url,apiUrl).pathname,body=await readBody(req);
  if(path==="/api/pooja-types")return json(res,200,{success:true,data:[{id:poojaId,name:"Satyanarayan Pooja",description:"A complete Vishnu pooja for prosperity and family wellbeing.",base_price:3500,duration_minutes:150,samagri_list:["Kalash","Flowers","Panchamrit"]},{id:"44444444-4444-4444-8444-444444444444",name:"Griha Pravesh",description:"Vastu shanti and blessings for a new home.",base_price:6500,duration_minutes:240,samagri_list:["Coconut","Mango leaves"]}]});
  if(path==="/api/booking-config")return json(res,200,{success:true,data:{slots:[{id:"morning",label:"9:00 AM",time_value:"09:00"},{id:"noon",label:"12:00 PM",time_value:"12:00"}]}});
  if(path==="/api/pandits/nearby")return json(res,200,{success:true,data:[{id:panditId,name:"Acharya Ved Prakash",experience_years:12,distance_km:2.4,specializations:["Satyanarayan Pooja","Griha Pravesh"]}]});
  if(path==="/api/auth/user/send-otp")return json(res,200,{success:true});
  if(path==="/api/auth/user/verify-otp")return json(res,200,{success:true,isNewUser:true,phone:body.phone});
  if(path==="/api/auth/user/register"){if(!body.terms_accepted||!body.privacy_accepted)return json(res,400,{success:false,message:"Policy acceptance required"});profileName=body.name;return json(res,201,{success:true,token:"e2e-token",user:{id:userId,name:profileName,phone:body.phone,email:body.email,address:body.address}});}
  if(path==="/api/auth/me"&&req.method==="GET")return json(res,200,{success:true,user:{id:userId,name:profileName,phone:"9876543210",email:"ritika@example.com",address:"Vijay Nagar, Indore",referral_eligible:true,referral_code:"TEMPLE01"}});
  if(path==="/api/auth/me"&&req.method==="PATCH"){profileName=body.name;return json(res,200,{success:true,user:{id:userId,...body}});}
  if(path==="/api/pricing/quote"){const coupon=body.coupon_code==="SAVE10"?{id:"coupon-1",code:"SAVE10"}:null;const discount=coupon?350:0;return json(res,200,{success:true,data:{list_price:3500,sale_price:3500,discount_amount:discount,total_price:3500-discount,payable_now:coupon?630:700,remaining_amount:coupon?2520:2800,payment_percent:20,festival_title:"Admin Festival Pricing",coupon,referral:body.referral_code?{id:"ref-1",code:body.referral_code,name:"Temple Partner",channel:"web",has_discount:false}:null,promotional_offer:null}});}
  if(path==="/api/bookings/create"){bookingCreated=true;return json(res,201,{success:true,booking:{id:"55555555-5555-4555-8555-555555555555"}});}
  if(path==="/api/payments/create-order")return json(res,200,{success:true,razorpay_key_id:"test",razorpay_order:{id:"order_stub",amount:70000,is_stub:true}});
  if(path==="/api/payments/verify")return json(res,200,{success:true});
  if(path.startsWith(`/api/bookings/user/${userId}`))return json(res,200,{success:true,data:bookingCreated?[{id:"55555555-5555-4555-8555-555555555555",pooja_name_en:"Satyanarayan Pooja",booking_date:"2026-09-15",booking_time:"09:00",total_price:3500,status:"pending"}]:[]});
  if(path.endsWith("/cancel")&&req.method==="PATCH")return json(res,200,{success:true});
  return json(res,404,{success:false,message:`Unhandled mock endpoint: ${req.method} ${path}`});
});
const listen=(server,port)=>new Promise((resolve,reject)=>server.listen(port,"127.0.0.1",resolve).once("error",reject));
const waitForWeb=async()=>{for(let i=0;i<60;i++){try{const r=await fetch(webUrl);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error("Vite server did not start");};
const check=(condition,message)=>{if(!condition)throw new Error(message);};

let vite,browser;
try{
  await mkdir(".e2e-artifacts",{recursive:true});await listen(mockApi,API_PORT);
  vite=spawn(process.execPath,["node_modules/vite/bin/vite.js","--host","127.0.0.1","--port",String(WEB_PORT)],{env:{...process.env,VITE_API_BASE_URL:apiUrl},stdio:["ignore","pipe","pipe"]});await waitForWeb();
  browser=await chromium.launch({executablePath:edgePath,headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},permissions:["geolocation"],geolocation:{latitude:22.7196,longitude:75.8577}}),page=await context.newPage(),browserErrors=[];page.setDefaultTimeout(12000);page.on("pageerror",e=>browserErrors.push(e.message));
  await page.goto(webUrl,{waitUntil:"networkidle"});await page.screenshot({path:".e2e-artifacts/home-desktop.png",fullPage:true});check(await page.getByText("Every sacred moment").isVisible(),"Homepage hero missing");check(await page.getByText("Satyanarayan Pooja").first().isVisible(),"Backend pooja missing");
  for(const route of ["/poojas","/pandits","/how-it-works","/about",`/pooja/${poojaId}`]){await page.goto(`${webUrl}${route}`,{waitUntil:"networkidle"});check((await page.locator("body").innerText()).length>250,`${route} content missing`);}
  await page.goto(`${webUrl}/poojas`,{waitUntil:"networkidle"});const poojaCard=page.getByRole("link",{name:"View details for Satyanarayan Pooja"});await poojaCard.click({position:{x:12,y:12}});await page.waitForURL(`**/pooja/${poojaId}`);await page.goBack({waitUntil:"networkidle"});await page.getByPlaceholder(/Search Satyanarayan/i).fill("Griha");check(await page.getByText("Griha Pravesh").isVisible(),"Catalogue search result missing");check(await page.getByText("Satyanarayan Pooja").count()===0,"Catalogue search did not filter results");
  await page.goto(`${webUrl}/pandits`,{waitUntil:"networkidle"});await page.getByRole("button",{name:/Find pandits near me/i}).click();await page.getByText("Acharya Ved Prakash").waitFor();
  await page.goto(`${webUrl}/pooja/${poojaId}`,{waitUntil:"networkidle"});await page.getByRole("button",{name:/Select date & book/i}).click();
  await page.locator(".phone-field input").fill("9876543210");await page.getByRole("button",{name:/Send secure OTP/i}).click();await page.locator("input.otp").fill("123456");await page.getByRole("button",{name:/Verify & continue/i}).click();
  await page.getByLabel(/Full name/i).fill("Ritika Sharma");await page.getByLabel(/^Email/i).fill("ritika@example.com");await page.getByLabel(/^Address/i).fill("Vijay Nagar, Indore");check(await page.getByRole("button",{name:/Create my account/i}).isDisabled(),"Registration allowed without policy consent");await page.locator(".consent input").check();await page.getByRole("button",{name:/Create my account/i}).click();await page.waitForURL(`**/book/${poojaId}`);
  await page.locator('input[type="date"]').fill("2026-08-15");await page.getByRole("button",{name:"9:00 AM"}).click();await page.getByText("Admin Festival Pricing special pricing").waitFor();await page.getByRole("button",{name:/Choose location/i}).click();await page.locator("textarea").fill("21 Vijay Nagar, Indore, Madhya Pradesh 452010");await page.getByRole("button",{name:/Choose pandits/i}).click();await page.getByText("Acharya Ved Prakash").waitFor();await page.getByRole("button",{name:/Acharya Ved Prakash/}).click();await page.getByRole("button",{name:/Review booking/i}).click();await page.getByLabel("Coupon code").fill("SAVE10");await page.getByRole("button",{name:"Apply codes"}).click();await page.getByText(/Coupon SAVE10 applied/).waitFor();await page.getByText(/Referral TEMPLE01/).waitFor();const payButton=page.getByRole("button",{name:/Pay ₹630 securely/i});await payButton.waitFor();await payButton.click();await page.getByText("Your booking request").waitFor();await page.screenshot({path:".e2e-artifacts/booking-success.png",fullPage:true});await page.getByRole("button",{name:/Go to my dashboard/i}).click();await page.waitForURL("**/dashboard");
  await page.goto(`${webUrl}/bookings`,{waitUntil:"networkidle"});check(await page.getByText("Satyanarayan Pooja").isVisible(),"Booking history missing");await page.getByRole("button",{name:"Cancel",exact:true}).click();await page.getByText("Change in plan").click();await page.getByRole("button",{name:"Confirm cancellation"}).click();
  await page.goto(`${webUrl}/account`,{waitUntil:"networkidle"});await page.getByRole("button",{name:"Edit profile"}).click();await page.getByLabel("Name").fill("Ritika Test");await page.getByRole("button",{name:"Save changes"}).click();await page.getByRole("heading",{name:"Ritika Test"}).waitFor();
  const mobile=await context.newPage();await mobile.setViewportSize({width:390,height:844});await mobile.goto(webUrl,{waitUntil:"networkidle"});await mobile.getByRole("button",{name:"Toggle menu"}).click();check(await mobile.getByRole("button",{name:"Ceremonies",exact:true}).isVisible(),"Mobile menu missing");await mobile.screenshot({path:".e2e-artifacts/home-mobile.png",fullPage:true});
  const guestContext=await browser.newContext({viewport:{width:1280,height:800}}),guest=await guestContext.newPage();await guest.goto(`${webUrl}/bookings`,{waitUntil:"networkidle"});await guest.getByRole("heading",{name:"Sign in to continue"}).waitFor();await guestContext.close();
  const offlineContext=await browser.newContext({viewport:{width:1280,height:800}}),offline=await offlineContext.newPage();await offline.route(`${apiUrl}/**`,route=>route.abort());await offline.goto(`${webUrl}/poojas`,{waitUntil:"networkidle"});await offline.getByRole("heading",{name:"Booking service is temporarily unavailable"}).waitFor();await offlineContext.close();
  check(browserErrors.length===0,`Browser errors: ${browserErrors.join(" | ")}`);console.log("PASS: routes, search, catalogue, pandits, OTP registration, required consent, admin schedule and pricing, protected routes, booking, payment, history, cancellation, profile, offline fallback, desktop and mobile");
}finally{await browser?.close().catch(()=>{});vite?.kill();vite?.stdout?.destroy();vite?.stderr?.destroy();mockApi.closeAllConnections?.();mockApi.close();}
