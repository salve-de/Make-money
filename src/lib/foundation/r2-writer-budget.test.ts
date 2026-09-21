import {describe,it,expect} from 'vitest';
import {preflightAndWrite,persistObjectChunks} from '../../../r2-writer/worker';
import {createHash} from 'node:crypto';

describe('R2 bounded resumable persistence',()=>{
  function fixture(count=5){
    const values=new Map<string,Uint8Array>();let calls=0;let puts=0;
    const bucket={head:async()=>{throw new Error('redundant HEAD');},get:async(key:string)=>{calls++;const v=values.get(key);return v?{arrayBuffer:async()=>v.slice().buffer}:null;},put:async(key:string,v:Uint8Array,opts?:{onlyIf?:{etagDoesNotMatch?:string}})=>{calls++;puts++;expect(opts?.onlyIf?.etagDoesNotMatch).toBe('*');if(values.has(key))return null;values.set(key,v.slice());return {arrayBuffer:async()=>v.slice().buffer};}};
    const objects=Array.from({length:count},(_,i)=>{const body=new TextEncoder().encode('record '+i);return {role:'entity',datasetId:'test',bucketName:'foundation-lake',bucket,key:'test/'+i,body,bytes:body.length,sha256:createHash('sha256').update(body).digest('hex'),contentType:'application/json',sourceEvidenceIds:[]};});
    return {values,objects,get calls(){return calls;},get puts(){return puts;}};
  }
  it('resumes create-only after a bounded partial write and verifies every object',async()=>{
    const f=fixture();await expect(preflightAndWrite(f.objects,{remaining:11})).rejects.toThrow('R2 write budget exhausted');
    expect(f.calls).toBe(11);expect(f.values.size).toBe(3);
    const before=f.calls;const result=await preflightAndWrite(f.objects,{remaining:11});
    expect(f.calls-before).toBe(9);expect(f.puts).toBe(5);expect(result.readback_verified).toBe(5);
    expect(result.results.filter(r=>r.status==='EXISTS_IDENTICAL')).toHaveLength(3);
    for(const row of result.results) expect(row.readback).toMatchObject({sha256_match:true});
  });
  it('rejects any conflict before creating any missing object',async()=>{
    const f=fixture();f.values.set('test/4',new TextEncoder().encode('different'));
    await expect(preflightAndWrite(f.objects,{remaining:20})).rejects.toThrow('R2_OBJECT_CONFLICT');expect(f.puts).toBe(0);
  });
  it('finishes a 1001-object plan across bounded invocations without rewriting completed chunks',async()=>{
    const f=fixture(1001);let result;let priorSize=0;let attempts=0;
    for(;attempts<10;attempts++){
      const before=f.calls;
      try {result=await persistObjectChunks(f.objects,f.objects[0].bucket,{remaining:900});}
      catch(e){expect((e as Error).message).toContain('budget exhausted');}
      expect(f.calls-before).toBeLessThanOrEqual(900);
      expect(f.values.size).toBeGreaterThan(priorSize);priorSize=f.values.size;
      if(result)break;
    }
    expect(result?.readback_verified).toBe(1001);expect(result?.results).toHaveLength(1001);
    expect(f.puts).toBe(1012);expect(attempts).toBeLessThan(10);
    const before=f.puts;await persistObjectChunks(f.objects,f.objects[0].bucket,{remaining:900});expect(f.puts).toBe(before);
  });
});
