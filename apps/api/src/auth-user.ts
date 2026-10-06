import type {User} from '@supabase/supabase-js';
// Use Auth's server-verified fields. user_metadata is editable by the user.
export function verifiedUser(user:User){return !user.is_anonymous&&!!((user.email&&user.email_confirmed_at)||(user.phone&&user.phone_confirmed_at));}
export function accountInfo(user:User){return {id:user.id,email:user.email_confirmed_at?user.email??null:null,phone:user.phone_confirmed_at?user.phone??null:null,email_verified:!!user.email_confirmed_at,phone_verified:!!user.phone_confirmed_at,providers:[...new Set((user.identities??[]).map(i=>i.provider).filter(p=>['email','phone','google'].includes(p)))]};}
