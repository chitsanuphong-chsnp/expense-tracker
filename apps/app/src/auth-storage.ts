export type Store={getItem:(key:string)=>Promise<string|null>;setItem:(key:string,value:string)=>Promise<void>;removeItem:(key:string)=>Promise<void>};
export function memoryStore():Store{const values=new Map<string,string>();return {getItem:async k=>values.get(k)??null,setItem:async(k,v)=>{values.set(k,v);},removeItem:async k=>{values.delete(k);}};}
// Only session/PKCE material is stored here. Passwords never enter storage.
// Operations and remember switches are serialized to avoid refresh-token races.
export class RememberedAuthStorage implements Store{
  private remember=false;private keys=new Set<string>();private queue:Promise<unknown>=Promise.resolve();
  constructor(private persistent:Store,private transient:Store,private preferences:Store){}
  private run<T>(fn:()=>Promise<T>):Promise<T>{const result=this.queue.then(fn);this.queue=result.catch(()=>{});return result;}
  private async policy(){this.remember=(await this.preferences.getItem('expense.auth.remember'))==='true';return this.remember;}
  getRemember(){return this.run(()=>this.policy());}
  getItem(key:string){return this.run(async()=>{this.keys.add(key);const remember=await this.policy();return (remember?this.persistent:this.transient).getItem(key);});}
  setItem(key:string,value:string){return this.run(async()=>{this.keys.add(key);const remember=await this.policy();await(remember?this.persistent:this.transient).setItem(key,value);await(remember?this.transient:this.persistent).removeItem(key);});}
  removeItem(key:string){return this.run(async()=>{await this.persistent.removeItem(key);await this.transient.removeItem(key);this.keys.delete(key);});}
  setRemember(value:boolean){return this.run(async()=>{const old=await this.policy();if(old===value)return;const source=old?this.persistent:this.transient,target=value?this.persistent:this.transient;for(const key of this.keys){const data=await source.getItem(key);if(data!==null)await target.setItem(key,data);}await this.preferences.setItem('expense.auth.remember',String(value));this.remember=value;for(const key of this.keys)await source.removeItem(key);});}
}
