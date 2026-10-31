import assert from 'node:assert/strict';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { browser,root,sleep } from './runtime.mjs';
function pixels(buffer){
 const width=buffer.readUInt32BE(16),height=buffer.readUInt32BE(20),type=buffer[25],channels=type===2?3:type===6?4:0;
 assert.equal(buffer[24],8);assert.equal(buffer[28],0);assert.ok(channels,'Unsupported PNG color type');
 const chunks=[];for(let at=8;at<buffer.length;){const length=buffer.readUInt32BE(at),tag=buffer.toString('ascii',at+4,at+8);if(tag==='IDAT')chunks.push(buffer.subarray(at+8,at+8+length));at+=length+12;}
 const compressed=inflateSync(Buffer.concat(chunks)),stride=width*channels,data=new Uint8Array(height*stride);
 function paeth(a,b,c){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
 for(let y=0;y<height;y++){const filter=compressed[y*(stride+1)];for(let x=0;x<stride;x++){const left=x>=channels?data[y*stride+x-channels]:0,up=y?data[(y-1)*stride+x]:0,corner=y&&x>=channels?data[(y-1)*stride+x-channels]:0;const prediction=filter===0?0:filter===1?left:filter===2?up:filter===3?Math.floor((left+up)/2):paeth(left,up,corner);data[y*stride+x]=(compressed[y*(stride+1)+x+1]+prediction)&255;}}
 return {width,height,channels,data};
}
const update=process.argv.includes('--update'),capture=process.argv.includes('--capture'),folder=join(root,'tests/baselines');
await mkdir(folder,{recursive:true});
await browser(async({navigate,viewport,evaluate,screenshot,call})=>{
 const version=await call('Browser.getVersion');
 for(const width of [320,390,768,1440])for(const theme of ['light','dark'])for(const density of ['default','compact']){
  await viewport(width);await navigate('tests/visual.html');await evaluate(`document.documentElement.dataset.bsTheme='${theme}';document.documentElement.dataset.uiDensity='${density}'`);await sleep(80);
  const name='visual-'+width+'-'+theme+(density==='compact'?'-compact':'')+'.png';await screenshot(name);const actual=await readFile(join(root,'test-results',name));
  if(capture){console.log('CAPTURED '+name);continue;}
  if(update){await writeFile(join(folder,name),actual);console.log('UPDATED '+name);continue;}
  const a=pixels(actual),b=pixels(await readFile(join(folder,name)));assert.equal(a.width,b.width);assert.equal(a.height,b.height);let different=0;
  for(let p=0;p<a.width*a.height;p++){let changed=false;for(let c=0;c<3;c++)if(Math.abs(a.data[p*a.channels+c]-b.data[p*b.channels+c])>16)changed=true;if(changed)different++;}
  const ratio=different/(a.width*a.height);assert.ok(ratio<=.002,name+' pixel difference '+(ratio*100).toFixed(3)+'%');console.log('PASS visual '+width+' '+theme+' '+density+'; difference '+(ratio*100).toFixed(3)+'%');
 }
 if(update)await writeFile(join(folder,'environment.json'),JSON.stringify({product:version.product,platform:'Linux',threshold:.002,channelTolerance:16},null,2)+'\n');
});
