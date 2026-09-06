import Link from 'next/link';
import '@/components/workspace/workspace.css';

export default function SuccessPage(){return <div className="ws-app" style={{display:'block'}}><main className="ws-main" style={{maxWidth:720}}><header className="ws-page-head"><h1>会員プランの確認</h1></header><p>決済・会員状態はアカウントで確認できます。</p><Link className="ws-button" href="/?tab=account" style={{marginTop:24}}>アカウントへ</Link></main></div>;}
