import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});
const sha256=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
 if(req.method!=="POST")return json({message:"只允許 POST 請求"},405);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!,serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 const authorization=req.headers.get("Authorization")||"";
 if(!authorization.startsWith("Bearer "))return json({message:"需要重新登入"},401);
 const userClient=createClient(url,anon,{global:{headers:{Authorization:authorization}},auth:{persistSession:false}});
 const {data:{user},error:userError}=await userClient.auth.getUser();
 if(userError||!user)return json({message:"登入工作階段無效"},401);
 let body:{recoveryHash?:string;channel?:string};try{body=await req.json()}catch{return json({message:"恢復請求格式不正確"},400)}
 if(!/^[0-9a-f]{64}$/.test(body.recoveryHash||"")||!["formal","test"].includes(body.channel||""))return json({message:"恢復請求格式不正確"},400);
 const forwarded=(req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim();
 const ipHash=await sha256(`${forwarded}:${serviceKey}`);
 const admin=createClient(url,serviceKey,{auth:{persistSession:false}});
 const {data,error}=await admin.rpc("recover_account_edge",{p_new_user:user.id,p_recovery_hash:body.recoveryHash,p_channel:body.channel,p_ip_hash:ipHash});
 if(error)return json({message:error.message},400);
 return json(data);
});
