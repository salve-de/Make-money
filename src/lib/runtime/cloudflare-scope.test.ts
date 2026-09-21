import {expect,it} from 'vitest';
import {getCloudflareRuntimeEnv,hasCloudflareRuntimeEnvScope,withCloudflareRuntimeEnv} from './cloudflare';

it('keeps overlapping Worker environments isolated and restores the outer scope',async()=>{
  expect(hasCloudflareRuntimeEnvScope()).toBe(false);
  const result=await Promise.all(['first','second'].map(name=>withCloudflareRuntimeEnv({name},async()=>{
    expect(hasCloudflareRuntimeEnvScope()).toBe(true);
    await Promise.resolve();expect((await getCloudflareRuntimeEnv())?.name).toBe(name);
    await withCloudflareRuntimeEnv({name:'nested'},async()=>expect((await getCloudflareRuntimeEnv())?.name).toBe('nested'));
    return (await getCloudflareRuntimeEnv())?.name;
  })));
  expect(result).toEqual(['first','second']);
});
