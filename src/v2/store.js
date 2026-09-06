import { analyticsEvent, migrateState, nowIso, unique } from "./core.js";
import { demoNotifications, publicCollections } from "./data.js";

const STORAGE_KEY="goldmine-radar:v3";
const LEGACY_KEYS=["goldmine-radar-state","goldmine-state","goldmine:v2","goldmine-radar:v2"];
const listeners=new Set();
let persistTimer=null;

function randomId(prefix="id"){
  return `${prefix}-${crypto.randomUUID?.()||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;
}

function readRaw(){
  try{
    const current=localStorage.getItem(STORAGE_KEY);
    if(current)return JSON.parse(current);
    for(const key of LEGACY_KEYS){
      const value=localStorage.getItem(key);
      if(value)return JSON.parse(value);
    }
  }catch(error){console.warn("State restore failed",error);}
  return null;
}

let state=migrateState(readRaw());
if(!state.notifications.length) state.notifications=structuredClone(demoNotifications);

function persist(){
  clearTimeout(persistTimer);
  persistTimer=setTimeout(()=>{
    try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
    catch(error){console.warn("State persist failed",error);}
  },35);
}

function notify(meta={}){
  persist();
  for(const listener of listeners){
    try{listener(state,meta);}catch(error){console.error(error);}
  }
  window.dispatchEvent(new CustomEvent("goldmine:state",{detail:{state,meta}}));
}

function commit(updater,meta={}){
  const next=typeof updater==="function"?updater(structuredClone(state)):updater;
  state=migrateState(next);
  notify(meta);
  return state;
}

function track(name,properties={}){
  const event=analyticsEvent(name,properties);
  state.analytics=[event,...state.analytics].slice(0,500);
  window.dispatchEvent(new CustomEvent("goldmine:analytics",{detail:event}));
  persist();
  return event;
}

export const store={
  getState:()=>state,
  snapshot:()=>structuredClone(state),
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  update(updater,meta){return commit(updater,meta);},
  track,
  setTheme(theme){
    commit(draft=>{draft.theme=theme;return draft;},{type:"theme"});
    document.documentElement.dataset.theme=theme;
    track("theme_changed",{theme});
  },
  finishOnboarding(preferences){
    commit(draft=>{draft.onboarding={done:true,step:3,completedAt:nowIso()};draft.preferences={...draft.preferences,...preferences};return draft;},{type:"onboarding"});
    track("onboarding_completed",preferences);
  },
  setPreference(key,value){commit(draft=>{draft.preferences[key]=value;return draft;},{type:"preference",key});track("preference_changed",{key,value});},
  toggleSaved(opportunityId){
    let active=false;
    commit(draft=>{active=!draft.saved.includes(opportunityId);draft.saved=active?[...draft.saved,opportunityId]:draft.saved.filter(id=>id!==opportunityId);return draft;},{type:"saved",opportunityId});
    track(active?"opportunity_saved":"opportunity_unsaved",{opportunityId});return active;
  },
  toggleWatched(opportunityId){
    let active=false;
    commit(draft=>{active=!draft.watched.includes(opportunityId);draft.watched=active?[...draft.watched,opportunityId]:draft.watched.filter(id=>id!==opportunityId);return draft;},{type:"watched",opportunityId});
    track(active?"market_watched":"market_unwatched",{opportunityId});return active;
  },
  toggleCompare(opportunityId){
    let active=false;let full=false;
    commit(draft=>{
      active=!draft.compare.includes(opportunityId);
      if(active&&draft.compare.length>=4){full=true;active=false;return draft;}
      draft.compare=active?[...draft.compare,opportunityId]:draft.compare.filter(id=>id!==opportunityId);
      return draft;
    },{type:"compare",opportunityId});
    if(!full)track(active?"compare_added":"compare_removed",{opportunityId});
    return {active,full};
  },
  clearCompare(){commit(draft=>{draft.compare=[];return draft;},{type:"compare-clear"});track("compare_cleared");},
  toggleReaction(opportunityId,kind){
    const key=`${opportunityId}:${kind}`;let active=false;
    commit(draft=>{active=!draft.reactions[key];draft.reactions[key]=active;if(!active)delete draft.reactions[key];return draft;},{type:"reaction",opportunityId,kind});
    track(active?"reaction_added":"reaction_removed",{opportunityId,kind});return active;
  },
  remember(route){commit(draft=>{draft.recent=unique([route,...draft.recent]).slice(0,16);return draft;},{type:"recent"});},
  addNote({entityType,entityId,title,body,tags=[]}){
    const note={id:randomId("note"),entityType,entityId,title:String(title||"メモ").slice(0,120),body:String(body||"").slice(0,6000),tags:unique(tags).slice(0,12),createdAt:nowIso(),updatedAt:nowIso()};
    commit(draft=>{draft.notes=[note,...draft.notes];return draft;},{type:"note-created",note});track("research_note_created",{entityType,entityId});return note;
  },
  updateNote(noteId,patch){
    commit(draft=>{draft.notes=draft.notes.map(note=>note.id===noteId?{...note,...patch,updatedAt:nowIso()}:note);return draft;},{type:"note-updated",noteId});track("research_note_updated",{noteId});
  },
  deleteNote(noteId){commit(draft=>{draft.notes=draft.notes.filter(note=>note.id!==noteId);return draft;},{type:"note-deleted",noteId});track("research_note_deleted",{noteId});},
  createCollection({title,description="",visibility="private"}){
    const collection={id:randomId("collection"),slug:`mine-${Date.now().toString(36)}`,title:String(title).slice(0,120),description:String(description).slice(0,1000),visibility,opportunityIds:[],owner:"me",ownerName:state.profile.displayName||"あなた",followers:0,createdAt:nowIso(),updatedAt:nowIso()};
    commit(draft=>{draft.collections=[collection,...draft.collections];return draft;},{type:"collection-created",collection});track("collection_created",{visibility});return collection;
  },
  updateCollection(collectionId,patch){commit(draft=>{draft.collections=draft.collections.map(collection=>collection.id===collectionId?{...collection,...patch,updatedAt:nowIso()}:collection);return draft;},{type:"collection-updated",collectionId});track("collection_updated",{collectionId});},
  deleteCollection(collectionId){commit(draft=>{draft.collections=draft.collections.filter(collection=>collection.id!==collectionId);return draft;},{type:"collection-deleted",collectionId});track("collection_deleted",{collectionId});},
  toggleCollectionItem(collectionId,opportunityId){
    let active=false;
    commit(draft=>{draft.collections=draft.collections.map(collection=>{
      if(collection.id!==collectionId)return collection;
      active=!collection.opportunityIds.includes(opportunityId);
      return {...collection,opportunityIds:active?[...collection.opportunityIds,opportunityId]:collection.opportunityIds.filter(id=>id!==opportunityId),updatedAt:nowIso()};
    });return draft;},{type:"collection-item",collectionId,opportunityId});
    track(active?"collection_item_added":"collection_item_removed",{collectionId,opportunityId});return active;
  },
  toggleFollowCollection(collectionId){
    const exists=[...publicCollections,...state.collections].some(collection=>collection.id===collectionId);if(!exists)return false;
    let active=false;
    commit(draft=>{active=!draft.collectionFollows.includes(collectionId);draft.collectionFollows=active?[...draft.collectionFollows,collectionId]:draft.collectionFollows.filter(id=>id!==collectionId);return draft;},{type:"collection-follow",collectionId});
    track(active?"collection_followed":"collection_unfollowed",{collectionId});return active;
  },
  addSubmission(type,payload){
    const submission={id:randomId("submission"),type,payload,status:"pending",createdAt:nowIso(),updatedAt:nowIso()};
    commit(draft=>{draft.submissions=[submission,...draft.submissions];return draft;},{type:"submission-created",submission});
    track("submission_created",{type});return submission;
  },
  createListing(payload){
    const listing={id:randomId("listing"),slug:`listing-${Date.now().toString(36)}`,...payload,applications:0,status:"pending",ownerId:"me",createdAt:nowIso(),updatedAt:nowIso()};
    commit(draft=>{draft.listings=[listing,...draft.listings];return draft;},{type:"listing-created",listing});track("listing_created",{listingType:payload.type});return listing;
  },
  updateListing(listingId,patch){commit(draft=>{draft.listings=draft.listings.map(listing=>listing.id===listingId?{...listing,...patch,updatedAt:nowIso()}:listing);return draft;},{type:"listing-updated",listingId});track("listing_updated",{listingId,status:patch.status});},
  applyToListing(listingId,payload){
    const duplicate=state.applications.some(application=>application.listingId===listingId&&!["withdrawn","rejected"].includes(application.status));
    if(duplicate)throw new Error("この募集にはすでに応募しています");
    const application={id:randomId("application"),listingId,...payload,status:"submitted",createdAt:nowIso(),updatedAt:nowIso()};
    commit(draft=>{draft.applications=[application,...draft.applications];return draft;},{type:"application-created",application});
    this.addNotification({type:"application",title:"応募を受け付けました",body:"掲載者が確認すると通知されます。",route:"#/dashboard"});
    track("listing_applied",{listingId});return application;
  },
  updateApplication(applicationId,status){
    const allowed=["submitted","reviewing","accepted","rejected","withdrawn"];
    if(!allowed.includes(status))throw new Error("不正な応募状態です");
    commit(draft=>{draft.applications=draft.applications.map(application=>application.id===applicationId?{...application,status,updatedAt:nowIso()}:application);return draft;},{type:"application-updated",applicationId,status});track("application_status_changed",{applicationId,status});
  },
  addReview(serviceId,payload){
    const review={id:randomId("review"),serviceId,...payload,author:state.profile.displayName||"匿名ユーザー",verified:false,helpful:0,status:"pending",createdAt:nowIso()};
    commit(draft=>{draft.reviews=[review,...draft.reviews];return draft;},{type:"review-created",review});track("review_submitted",{serviceId,rating:payload.rating});return review;
  },
  toggleReviewHelpful(reviewId){
    let active=false;
    commit(draft=>{active=!draft.helpfulReviews.includes(reviewId);draft.helpfulReviews=active?[...draft.helpfulReviews,reviewId]:draft.helpfulReviews.filter(id=>id!==reviewId);return draft;},{type:"review-helpful",reviewId});track(active?"review_helpful":"review_unhelpful",{reviewId});return active;
  },
  addCorrection(entityType,entityId,payload){
    const correction={id:randomId("correction"),entityType,entityId,...payload,status:"pending",createdAt:nowIso()};
    commit(draft=>{draft.corrections=[correction,...draft.corrections];return draft;},{type:"correction-created",correction});track("correction_submitted",{entityType,entityId});return correction;
  },
  addNotification(payload){
    const notification={id:randomId("notification"),read:false,createdAt:nowIso(),...payload};
    commit(draft=>{draft.notifications=[notification,...draft.notifications].slice(0,200);return draft;},{type:"notification-added",notification});return notification;
  },
  markNotification(notificationId,read=true){commit(draft=>{draft.notifications=draft.notifications.map(item=>item.id===notificationId?{...item,read}:item);return draft;},{type:"notification-read",notificationId});},
  markAllNotifications(){commit(draft=>{draft.notifications=draft.notifications.map(item=>({...item,read:true}));return draft;},{type:"notifications-read-all"});track("notifications_marked_all");},
  updateProfile(patch){commit(draft=>{draft.profile={...draft.profile,...patch};return draft;},{type:"profile-updated"});track("profile_updated",{fields:Object.keys(patch)});},
  setPlan(plan){commit(draft=>{draft.plan=plan;return draft;},{type:"plan",plan});track("plan_changed",{plan});},
  updateNewsletter(patch){commit(draft=>{draft.newsletter={...draft.newsletter,...patch};return draft;},{type:"newsletter"});track("newsletter_changed",patch);},
  setCloudStatus(status,lastSync=null){commit(draft=>{draft.cloud={status,lastSync:lastSync||draft.cloud.lastSync};return draft;},{type:"cloud",status});},
  importState(payload){state=migrateState(payload);notify({type:"import"});track("state_imported");return state;},
  exportState(){return JSON.stringify({...state,exportedAt:nowIso(),app:"GOLDMINE RADAR"},null,2);},
  reset({keepProfile=false}={}){
    const profile=keepProfile?state.profile:null;state=migrateState(null);if(profile)state.profile=profile;state.notifications=structuredClone(demoNotifications);notify({type:"reset"});track("state_reset");return state;
  }
};

window.addEventListener("storage",event=>{
  if(event.key!==STORAGE_KEY||!event.newValue)return;
  try{state=migrateState(JSON.parse(event.newValue));notify({type:"cross-tab"});}catch{}
});

document.documentElement.dataset.theme=state.theme||"dark";
