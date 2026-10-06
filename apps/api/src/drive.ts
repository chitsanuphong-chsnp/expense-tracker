import { JWT } from 'google-auth-library';
let auth:JWT|undefined;
// One service account belongs to the primary owner in v1. A folder ID is not authorization.
export function assertDriveOwner(owner:string) {
  if(!process.env.DRIVE_OWNER_ID||owner!==process.env.DRIVE_OWNER_ID)throw new Error('DRIVE_NOT_ENABLED_FOR_ACCOUNT');
}
async function driveFetch(path:string) {
  if(!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL||!process.env.GOOGLE_PRIVATE_KEY)throw new Error('DRIVE_NOT_CONFIGURED');
  auth??=new JWT({email:process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,key:process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g,'\n'),scopes:['https://www.googleapis.com/auth/drive.readonly']});
  const token=await auth.getAccessToken();
  const response=await fetch(`https://www.googleapis.com/drive/v3/${path}`,{headers:{Authorization:`Bearer ${token.token}`},signal:AbortSignal.timeout(25000)});
  if(!response.ok)throw new Error(`DRIVE_${response.status}`);return response;
}
export async function listFolder(folder:string,pageToken?:string) {
  if(!/^[A-Za-z0-9_-]{10,200}$/.test(folder))throw new Error('INVALID_FOLDER');
  const q=new URLSearchParams({q:`'${folder}' in parents and trashed = false`,fields:'nextPageToken,files(id,name,mimeType,createdTime,size)',pageSize:'100',orderBy:'createdTime'});
  if(pageToken)q.set('pageToken',pageToken);
  return (await (await driveFetch(`files?${q}`)).json()) as {nextPageToken?:string;files:{id:string;name:string;mimeType:string;createdTime:string;size?:string}[]};
}
export async function downloadFile(id:string) {
  if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw new Error('INVALID_FILE');
  const response=await driveFetch(`files/${id}?alt=media`);
  if(Number(response.headers.get('content-length'))>12*1024*1024)throw new Error('IMAGE_TOO_LARGE');
  const reader=response.body!.getReader(); const chunks:Uint8Array[]=[];let n=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;n+=value.byteLength;if(n>12*1024*1024)throw new Error('IMAGE_TOO_LARGE');chunks.push(value);}}finally{await reader.cancel();}
  return Buffer.concat(chunks);
}
