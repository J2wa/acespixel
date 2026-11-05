import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Codex} from '../server/providers/codex.mjs';
test('Codex adapter initializes, reads limits and resolves the final completed message',async t=>{const c=new Codex('/tmp/pixel-test-home',fileURLToPath(new URL('./fixtures/fake-codex.mjs',import.meta.url)));t.after(()=>c.stop());await c.start();const usage=await c.request('account/rateLimits/read');assert.equal(usage.rateLimits.primary.usedPercent,25);let streamed='';const result=await c.run('Test task','/tmp',{onText:s=>streamed=s});assert.equal(result,'Final verified output');assert.equal(streamed,result);await assert.rejects(()=>c.request('unknown'),/Unsupported/);});
test('missing Codex executable fails visibly instead of hanging',async()=>{const c=new Codex('/tmp','/nonexistent/pixel-codex');await assert.rejects(()=>c.start());c.stop();});
