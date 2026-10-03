// Full-size pixel operations run off the UI thread. Buffers are transferred.
let ops;
self.onmessage=async({data:{id,action,pixels,width,height,values,x,y,tolerance}})=>{
  try{
    ops??=await import('/ui/image-ops.js');
    let result;
    if(action==='adjust')result=ops.adjustPixels({data:new Uint8ClampedArray(pixels)},values);
    else if(action==='cutout'){
      if(!self.MagicWand)importScripts('/vendor/magic-wand.js');
      result=new Uint8ClampedArray(pixels);
      const mask=MagicWand.floodFill({data:result,width,height,bytes:4},x,y,tolerance,undefined,true);
      if(mask)ops.applyMask(result,mask.data);
    }else throw new Error('Unknown image operation.');
    self.postMessage({id,pixels:result.buffer},[result.buffer]);
  }catch(error){self.postMessage({id,error:error.message});}
};
