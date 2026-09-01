import { safeExternalUrl } from "./core.js";
import { store } from "./store.js";

const SESSION_KEY="goldmine-radar:supabase-session";

function readConfig(){
  const injected=globalThis.GOLDMINE_CONFIG||{};
  const local=(()=>{try{return JSON.parse(localStorage.getItem("goldmine-radar:cloud-config")||"{}");}catch{return {};}})();
  const url=String(injected.supabaseUrl||local.supabaseUrl||"").replace(/\/$/,"");
  const anonKey=String(injected.supabaseAnonKey||local.supabaseAnonKey||"");
  const siteUrl=String(injected.siteUrl||local.siteUrl||location.origin+location.pathname);
  return {url,anonKey,siteUrl,configured:Boolean(url&&anonKey&&safeExternalUrl(url))};
}

let config=readConfig();
let session=loadSession();
let refreshPromise=null;

function loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||"null");}catch{return null;}}
function saveSession(value){session=value;if(value)localStorage.setItem(SESSION_KEY,JSON.stringify(value));else localStorage.removeItem(SESSION_KEY);}
function expiresSoon(value=session){return !value?.expires_at||value.expires_at*1000-Date.now()<90000;}

async function parseResponse(response){
  const text=await response.text();
  let body=null;try{body=text?JSON.parse(text):null;}catch{body=text;}
  if(!response.ok){
    const error=new Error(body?.msg||body?.message||body?.error_description||body?.error||`Request failed (${response.status})`);
    error.status=response.status;error.body=body;throw error;
  }
  return body;
}

async function authFetch(path,{method="POST",body,accessToken}={}){
  if(!config.configured)throw new Error("Supabaseが設定されていません");
  const headers={apikey:config.anonKey,"Content-Type":"application/json"};
  if(accessToken)headers.Authorization=`Bearer ${accessToken}`;
  return parseResponse(await fetch(`${config.url}/auth/v1${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}));
}

async function refreshSession(){
  if(!session?.refresh_token)return null;
  if(refreshPromise)return refreshPromise;
  refreshPromise=authFetch("/token?grant_type=refresh_token",{body:{refresh_token:session.refresh_token}})
    .then(next=>{saveSession(next);return next;})
    .catch(error=>{saveSession(null);throw error;})
    .finally(()=>{refreshPromise=null;});
  return refreshPromise;
}

async function ensureSession(){if(session&&expiresSoon())await refreshSession().catch(()=>null);return session;}

async function rest(path,{method="GET",body,headers={},prefer="return=representation",auth=true}={}){
  if(!config.configured)throw new Error("Supabaseが設定されていません");
  const current=auth?await ensureSession():session;
  const requestHeaders={apikey:config.anonKey,Authorization:`Bearer ${current?.access_token||config.anonKey}`,Accept:"application/json",...headers};
  if(body!==undefined)requestHeaders["Content-Type"]="application/json";
  if(prefer)requestHeaders.Prefer=prefer;
  const response=await fetch(`${config.url}/rest/v1/${path}`,{method,headers:requestHeaders,body:body===undefined?undefined:JSON.stringify(body)});
  return parseResponse(response);
}

async function rpc(name,args={}){return rest(`rpc/${encodeURIComponent(name)}`,{method:"POST",body:args});}

async function invoke(functionName,payload={},options={}){
  if(!config.configured)throw new Error("Supabaseが設定されていません");
  const current=await ensureSession();
  const response=await fetch(`${config.url}/functions/v1/${encodeURIComponent(functionName)}`,{
    method:"POST",headers:{apikey:config.anonKey,Authorization:`Bearer ${current?.access_token||config.anonKey}`,"Content-Type":"application/json",...(options.headers||{})},body:JSON.stringify(payload)
  });
  return parseResponse(response);
}

function currentUser(){return session?.user||null;}

export const cloud={
  get config(){return {...config};},
  get session(){return session;},
  get user(){return currentUser();},
  get configured(){return config.configured;},
  configure(next){
    const safeUrl=safeExternalUrl(next.supabaseUrl);
    if(!safeUrl)throw new Error("Supabase URLを確認してください");
    localStorage.setItem("goldmine-radar:cloud-config",JSON.stringify({supabaseUrl:safeUrl.replace(/\/$/,""),supabaseAnonKey:String(next.supabaseAnonKey||""),siteUrl:next.siteUrl||location.origin+location.pathname}));
    config=readConfig();return config;
  },
  clearConfig(){localStorage.removeItem("goldmine-radar:cloud-config");config=readConfig();saveSession(null);},
  async signUp(email,password,metadata={}){
    const result=await authFetch("/signup",{body:{email,password,data:metadata,options:{emailRedirectTo:`${config.siteUrl}#/account`}}});
    if(result.access_token)saveSession(result);store.track("cloud_signup",{});return result;
  },
  async signIn(email,password){
    const result=await authFetch("/token?grant_type=password",{body:{email,password}});saveSession(result);store.track("cloud_signin",{});return result;
  },
  async signInWithMagicLink(email){
    const result=await authFetch("/otp",{body:{email,create_user:true,options:{emailRedirectTo:`${config.siteUrl}#/account`}}});store.track("cloud_magic_link",{});return result;
  },
  async recover(email){return authFetch("/recover",{body:{email,redirect_to:`${config.siteUrl}#/account?recovery=1`}});},
  async updatePassword(password){const current=await ensureSession();const result=await authFetch("/user",{method:"PUT",accessToken:current?.access_token,body:{password}});return result;},
  async signOut(){const current=await ensureSession();if(current?.access_token)await authFetch("/logout",{accessToken:current.access_token}).catch(()=>null);saveSession(null);store.setCloudStatus("local");store.track("cloud_signout",{});},
  async getUser(){const current=await ensureSession();if(!current?.access_token)return null;return authFetch("/user",{method:"GET",accessToken:current.access_token});},
  async consumeAuthRedirect(){
    const params=new URLSearchParams(location.hash.includes("access_token")?location.hash.slice(1):location.search);
    const access_token=params.get("access_token"),refresh_token=params.get("refresh_token"),expires_in=Number(params.get("expires_in")||3600),type=params.get("type");
    if(access_token&&refresh_token){saveSession({access_token,refresh_token,expires_in,expires_at:Math.floor(Date.now()/1000)+expires_in,token_type:"bearer",user:null});await this.getUser().then(user=>{session.user=user;saveSession(session);}).catch(()=>null);history.replaceState(null,"",`${location.pathname}#/account${type?`?type=${encodeURIComponent(type)}`:""}`);return true;}
    return false;
  },
  rest,rpc,invoke,
  async fetchPublished(){
    const [opportunities,signals,products,demands,listings,collections]=await Promise.all([
      rest("organic_ranked_opportunities?select=*&order=organic_score.desc",{auth:false}),
      rest("money_signals?select=*&status=eq.published&order=published_at.desc",{auth:false}),
      rest("products?select=*&status=eq.published&order=published_at.desc",{auth:false}),
      rest("demands?select=*&status=eq.published&order=published_at.desc",{auth:false}),
      rest("public_listings?select=*&status=eq.open&order=published_at.desc",{auth:false}),
      rest("public_collections?select=*&visibility=eq.public&order=updated_at.desc",{auth:false})
    ]);
    return {opportunities,signals,products,demands,listings,collections};
  },
  async syncPersonalState(){
    const user=currentUser();if(!user)return {synced:false,reason:"unauthenticated"};
    store.setCloudStatus("syncing");
    try{
      const state=store.getState();
      await Promise.all([
        rest("profiles?on_conflict=id",{method:"POST",body:{id:user.id,display_name:state.profile.displayName||null,handle:state.profile.handle||null},prefer:"resolution=merge-duplicates,return=minimal"}),
        rpc("sync_user_preferences",{p_preferences:state.preferences,p_theme:state.theme,p_plan_hint:state.plan}),
        rpc("sync_local_reactions",{p_saved:state.saved,p_watched:state.watched,p_reactions:state.reactions}),
        rpc("sync_research_notes",{p_notes:state.notes}),
        rpc("sync_user_collections",{p_collections:state.collections})
      ]);
      const syncedAt=new Date().toISOString();store.setCloudStatus("synced",syncedAt);store.track("cloud_sync_completed",{});return {synced:true,syncedAt};
    }catch(error){store.setCloudStatus("error");store.track("cloud_sync_failed",{message:error.message});throw error;}
  },
  async hydratePersonalState(){
    const user=currentUser();if(!user)return null;
    const [profile,preferences,reactions,notes,collections,notifications,subscription]=await Promise.all([
      rest(`profiles?select=*&id=eq.${user.id}&limit=1`),rest("user_preferences?select=*&limit=1"),
      rest("reactions?select=opportunity_id,kind,active&active=eq.true"),rest("research_notes?select=*&order=updated_at.desc"),
      rest("collections?select=*,collection_items(opportunity_id)&owner_id=eq."+user.id),
      rest("notifications?select=*&order=created_at.desc&limit=100"),rest("subscriptions?select=*&status=in.(active,trialing,past_due)&limit=1")
    ]);
    const patch={profile:profile[0]?{displayName:profile[0].display_name||"",handle:profile[0].handle||"",role:profile[0].role||"member"}:undefined};
    if(preferences[0]){patch.preferences=preferences[0].preferences||{};patch.theme=preferences[0].theme||"dark";}
    patch.saved=reactions.filter(r=>r.kind==="save").map(r=>r.opportunity_id);
    patch.watched=reactions.filter(r=>r.kind==="watch").map(r=>r.opportunity_id);
    patch.reactions=Object.fromEntries(reactions.filter(r=>!["save","watch"].includes(r.kind)).map(r=>[`${r.opportunity_id}:${r.kind}`,true]));
    patch.notes=notes.map(n=>({id:n.id,entityType:n.entity_type,entityId:n.entity_id,title:n.title,body:n.body,tags:n.tags||[],createdAt:n.created_at,updatedAt:n.updated_at}));
    patch.collections=collections.map(c=>({id:c.id,slug:c.slug,title:c.title,description:c.description||"",visibility:c.visibility,opportunityIds:(c.collection_items||[]).map(i=>i.opportunity_id),owner:"me",ownerName:patch.profile?.displayName||"あなた",followers:c.follower_count||0,createdAt:c.created_at,updatedAt:c.updated_at}));
    patch.notifications=notifications.map(n=>({id:n.id,type:n.type,title:n.title,body:n.body,route:n.route,read:Boolean(n.read_at),createdAt:n.created_at}));
    if(subscription[0])patch.plan=subscription[0].plan_code||"pro";
    store.update(draft=>({...draft,...Object.fromEntries(Object.entries(patch).filter(([,value])=>value!==undefined))}),{type:"cloud-hydrate"});
    store.setCloudStatus("synced",new Date().toISOString());return patch;
  },
  async submit(type,payload){return rest("submissions",{method:"POST",body:{submission_type:type,payload,status:"pending",contact_email:payload.email||null,submitted_url:payload.url||payload.source||null}});},
  async submitReaction(opportunityId,kind,active=true){return rpc("set_reaction",{p_opportunity_id:opportunityId,p_kind:kind,p_active:active});},
  async submitApplication(listingId,payload){return rpc("apply_to_listing",{p_listing_id:listingId,p_message:payload.message,p_contact_email:payload.email||null,p_website_url:payload.website||null});},
  async submitReview(serviceId,payload){return rest("reviews",{method:"POST",body:{product_id:serviceId,rating:payload.rating,title:payload.title,body:payload.body,relationship:payload.relationship,status:"pending"}});},
  async submitCorrection(entityType,entityId,payload){return rest("correction_requests",{method:"POST",body:{entity_type:entityType,entity_id:entityId,claim:payload.claim,source_url:payload.source,contact_email:payload.contact||null,status:"pending"}});},
  async requestClaim(productId,method="domain_email"){return rpc("create_product_claim",{p_product_id:productId,p_method:method});},
  async previewUrl(url){return invoke("url-preview",{url});},
  async startCheckout(planCode){return invoke("stripe-checkout",{planCode,returnUrl:`${config.siteUrl}#/account?checkout=complete`});},
  async openBillingPortal(){return invoke("stripe-portal",{returnUrl:`${config.siteUrl}#/account`});},
  async subscribeNewsletter(email,frequency="weekly"){return invoke("newsletter-subscribe",{email,frequency,redirectUrl:`${config.siteUrl}#/account?newsletter=confirmed`});}
};

export async function bootstrapCloud(){
  if(!config.configured){store.setCloudStatus("local");return {mode:"local",configured:false,user:null};}
  try{
    await cloud.consumeAuthRedirect();
    const user=await cloud.getUser().catch(()=>null);
    if(user){session.user=user;saveSession(session);await cloud.hydratePersonalState().catch(()=>null);}
    store.setCloudStatus(user?"synced":"configured",user?new Date().toISOString():null);
    return {mode:user?"cloud":"configured",configured:true,user};
  }catch(error){store.setCloudStatus("error");return {mode:"error",configured:true,user:null,error};}
}
