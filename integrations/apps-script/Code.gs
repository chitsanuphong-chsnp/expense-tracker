/** Optional replacement example. Preserve your working deployment unless needed. */
function doPost(e) {
  try {
    const p=JSON.parse(e.postData.contents),props=PropertiesService.getScriptProperties();
    const token=props.getProperty('UPLOAD_TOKEN');
    if(!token||token.length<32||p.token!==token)return respond({ok:false,error:'UNAUTHORIZED'});
    const folders={ttb:'FOLDER_TTB',kplus:'FOLDER_KPLUS',krungthai:'FOLDER_KRUNGTHAI',make:'FOLDER_MAKE'};
    const property=folders[String(p.bank||'').toLowerCase()];
    if(!property||!props.getProperty(property))return respond({ok:false,error:'UNKNOWN_BANK'});
    const root=DriveApp.getFolderById(props.getProperty(property));
    const date=Utilities.formatDate(new Date(),'Asia/Bangkok','yyyy-MM-dd');
    const images=p.images||p.files||[{imageBase64:p.imageBase64,fileName:p.fileName}];
    if(!Array.isArray(images)||images.length===0||images.length>50)return respond({ok:false,error:'INVALID_IMAGES'});
    const lock=LockService.getScriptLock();lock.waitLock(20000);
    try {
      const matches=root.getFoldersByName(date),folder=matches.hasNext()?matches.next():root.createFolder(date);
      const result=images.map(item=>{
        const encoded=typeof item==='string'?item:item.imageBase64;
        if(typeof encoded!=='string'||encoded.length>17000000)throw new Error('INVALID_IMAGE');
        const bytes=Utilities.base64Decode(encoded.replace(/^data:image\/[^;]+;base64,/,''));
        if(bytes.length>12*1024*1024)throw new Error('IMAGE_TOO_LARGE');
        const jpeg=(bytes[0]&255)===255&&(bytes[1]&255)===216;
        const png=(bytes[0]&255)===137&&(bytes[1]&255)===80;
        if(!jpeg&&!png)throw new Error('USE_JPEG_OR_PNG');
        const hash=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,bytes).map(b=>(b&255).toString(16).padStart(2,'0')).join('');
        const name=hash+(jpeg?'.jpg':'.png'),existing=folder.getFilesByName(name);
        const file=existing.hasNext()?existing.next():folder.createFile(Utilities.newBlob(bytes,jpeg?'image/jpeg':'image/png',name));
        return {fileId:file.getId()};
      });
      return respond({ok:true,...(result.length===1?result[0]:{}),files:result});
    }finally{lock.releaseLock();}
  }catch(err){return respond({ok:false,error:/^[A-Z_]+$/.test(err.message)?err.message:'UPLOAD_FAILED'});}
}
function respond(value){return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);}
