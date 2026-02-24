import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";

const C = {
  bg:"#0b1629", bgCard:"#112240", bgInput:"#0d1d35", bgForm:"#0f1f3a",
  border:"#1e3a5f", header:"#091526", tab:"#0d1d35", yellow:"#f5c518",
  textPri:"#e8f4fd", textSec:"#7aa3c8", textMuted:"#3d6080",
  danger:"#ef4444", success:"#22c55e", warn:"#f59e0b", blue:"#60a5fa",
};
const STATUS = {
  active:    {label:"アクティブ",  color:"#22c55e",bg:"#052e16",icon:"✅"},
  repair:    {label:"修理中",      color:"#ef4444",bg:"#1f0a0a",icon:"🔧"},
  waiting:   {label:"修理待機中",  color:"#f59e0b",bg:"#1a110a",icon:"⏳"},
  estimating:{label:"見積もり中",  color:"#60a5fa",bg:"#0a1628",icon:"📋"},
};
const LOG_TYPES = {
  oil:        {label:"オイル交換",    icon:"🛢️",color:"#f59e0b"},
  battery:    {label:"バッテリー交換",icon:"🔋",color:"#60a5fa"},
  tire:       {label:"タイヤ交換",    icon:"⚙️",color:"#a78bfa"},
  half_year:  {label:"半年点検",      icon:"🔍",color:"#34d399"},
  inspection: {label:"車検",          icon:"📋",color:"#22c55e"},
  repair:     {label:"修理",          icon:"🔩",color:"#f87171"},
  other:      {label:"その他",        icon:"🔧",color:"#94a3b8"},
};
const CLASS_COLORS=["#f5c518","#60a5fa","#34d399","#f87171","#a78bfa","#f59e0b","#22c55e","#ef4444","#8b5cf6","#06b6d4"];

function formatDate(s){if(!s)return"未設定";const d=new Date(s);return`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;}
function daysUntil(s){if(!s)return null;return Math.ceil((new Date(s)-new Date())/86400000);}
function fmtYen(n){return n?`¥${Number(n).toLocaleString()}`:"—";}
function getYM(d){return d?d.slice(0,7):"";}
function getCalYear(d){return d?parseInt(d.slice(0,4),10):null;}

const btn ={background:C.yellow,color:"#000",border:"none",padding:"9px 20px",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:"bold",letterSpacing:1,borderRadius:3};
const btn2={background:"none",color:C.textSec,border:`1px solid ${C.border}`,padding:"9px 18px",cursor:"pointer",fontFamily:"inherit",fontSize:12,borderRadius:3};
const btnD={background:"none",color:C.danger,border:`1px solid ${C.danger}`,padding:"6px 14px",cursor:"pointer",fontFamily:"inherit",fontSize:11,borderRadius:3};
const inp ={width:"100%",background:C.bgInput,border:`1px solid ${C.border}`,color:C.textPri,padding:"9px 12px",fontFamily:"inherit",fontSize:13,boxSizing:"border-box",borderRadius:3,outline:"none"};
const frm ={background:C.bgForm,border:`1px solid ${C.border}`,borderRadius:6,padding:24,marginBottom:20};
const thS ={color:C.textMuted,fontSize:11,textAlign:"left",padding:"10px 14px",fontWeight:"normal",borderBottom:`1px solid ${C.border}`};
const tdS ={padding:"12px 14px",color:C.textPri,verticalAlign:"middle",borderBottom:`1px solid ${C.border}22`};

/* ─── UI部品 ─── */
function Plate({plate,size="md"}){
  const s={sm:{fs:12,p:"3px 10px",ls:2},md:{fs:15,p:"5px 16px",ls:3},lg:{fs:20,p:"8px 22px",ls:4}}[size];
  return <div style={{display:"inline-flex",alignItems:"center",background:C.plateBg||C.header,border:`1.5px solid ${C.yellow}`,borderRadius:4,padding:s.p,boxShadow:`0 0 10px ${C.yellow}33`}}><span style={{color:C.yellow,fontSize:s.fs,fontWeight:"bold",letterSpacing:s.ls,fontFamily:"'Courier New',monospace"}}>{plate||"—"}</span></div>;
}
function StatusBadge({status,size="sm"}){
  const s=STATUS[status]||STATUS.active;
  return <div style={{display:"inline-flex",alignItems:"center",gap:5,background:s.bg,border:`1px solid ${s.color}55`,borderRadius:20,padding:size==="lg"?"5px 12px":"3px 10px"}}><span style={{fontSize:size==="lg"?14:12}}>{s.icon}</span><span style={{color:s.color,fontSize:size==="lg"?13:11,fontWeight:"bold"}}>{s.label}</span></div>;
}
function ClassBadge({name,color,size="sm"}){
  if(!name)return null;
  const col=color||C.yellow;
  return <div style={{display:"inline-flex",alignItems:"center",gap:4,background:`${col}22`,border:`1px solid ${col}66`,borderRadius:20,padding:size==="lg"?"5px 14px":"3px 10px"}}><span style={{color:col,fontSize:size==="lg"?13:11,fontWeight:"bold"}}>◆ {name}</span></div>;
}
function StatusSelect({value,onChange}){
  return <select value={value||"active"} onChange={e=>{e.stopPropagation();onChange(e.target.value);}} style={{background:C.bgInput,border:`1px solid ${C.border}`,color:C.textPri,padding:"6px 10px",fontFamily:"inherit",fontSize:12,borderRadius:3,cursor:"pointer"}}>{Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select>;
}
function InfoRow({label,value,alert,alertText}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"5px 0",borderBottom:`1px solid ${C.border}22`}}><span style={{color:C.textMuted,fontSize:11}}>{label}</span><span style={{color:alert?C.danger:C.textPri,fontSize:12}}>{value}{alert&&alertText&&<span style={{background:C.danger,color:"#fff",fontSize:10,padding:"2px 6px",borderRadius:3,marginLeft:6}}>{alertText}</span>}</span></div>;
}
function FR({label,children}){return <div style={{marginBottom:14}}><label style={{display:"block",color:C.textSec,fontSize:11,letterSpacing:1,marginBottom:6}}>{label}</label>{children}</div>;}

function DateSelect({value,onChange}){
  // 内部stateで年・月・日を独立管理し、3つ揃ったときだけ親へ通知
  const parse=v=>{const p=v?v.split("-"):["","",""];return[p[0]?String(parseInt(p[0],10)):"",p[1]?String(parseInt(p[1],10)):"",p[2]?String(parseInt(p[2],10)):""];};
  const [ymd,setYmd]=useState(()=>parse(value));
  const [y,m,d]=ymd;
  // 外部valueが変わったとき同期
  useState(()=>{setYmd(parse(value));},[value]);
  const ty=new Date().getFullYear();
  const years=Array.from({length:12},(_,i)=>String(ty-4+i));
  const months=Array.from({length:12},(_,i)=>String(i+1));
  const days=Array.from({length:31},(_,i)=>String(i+1));
  const sel={background:C.bgInput,border:`1px solid ${C.border}`,color:C.textPri,padding:"9px 8px",fontFamily:"inherit",fontSize:13,borderRadius:3,outline:"none",cursor:"pointer"};
  function update(ny,nm,nd){
    setYmd([ny,nm,nd]);
    if(ny&&nm&&nd){onChange(`${ny}-${nm.padStart(2,"0")}-${nd.padStart(2,"0")}`);}
  }
  return <div style={{display:"flex",gap:6}}>
    <select value={y} onChange={e=>update(e.target.value,m,d)} style={{...sel,flex:2}}><option value="">年</option>{years.map(v=><option key={v} value={v}>{v}年</option>)}</select>
    <select value={m} onChange={e=>update(y,e.target.value,d)} style={{...sel,flex:1.5}}><option value="">月</option>{months.map(v=><option key={v} value={v}>{v}月</option>)}</select>
    <select value={d} onChange={e=>update(y,m,e.target.value)} style={{...sel,flex:1.5}}><option value="">日</option>{days.map(v=><option key={v} value={v}>{v}日</option>)}</select>
  </div>;
}
function MonthSelect({value,onChange}){
  const parse=v=>{const p=v?v.split("-"):["",""];return[p[0]?String(parseInt(p[0],10)):"",p[1]?String(parseInt(p[1],10)):""];};
  const [ym,setYm]=useState(()=>parse(value));
  const [y,m]=ym;
  const ty=new Date().getFullYear();
  const years=Array.from({length:8},(_,i)=>String(ty-2+i));
  const months=Array.from({length:12},(_,i)=>String(i+1));
  const sel={background:C.bgInput,border:`1px solid ${C.border}`,color:C.textPri,padding:"9px 8px",fontFamily:"inherit",fontSize:13,borderRadius:3,outline:"none",cursor:"pointer"};
  function update(ny,nm){
    setYm([ny,nm]);
    if(ny&&nm){onChange(`${ny}-${nm.padStart(2,"0")}`);}
  }
  return <div style={{display:"flex",gap:6}}>
    <select value={y} onChange={e=>update(e.target.value,m)} style={{...sel,flex:2}}><option value="">年</option>{years.map(v=><option key={v} value={v}>{v}年</option>)}</select>
    <select value={m} onChange={e=>update(y,e.target.value)} style={{...sel,flex:1.5}}><option value="">月</option>{months.map(v=><option key={v} value={v}>{v}月</option>)}</select>
  </div>;
}

function LogForm({car,onSave,onClose}){
  const [form,setForm]=useState({type:"oil",date:"",note:"",amount:"",payee:""});
  return <div style={{background:C.bgForm,borderTop:`1px solid ${C.yellow}44`,padding:"20px 24px"}}>
    <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── 整備ログを追加：{car.name}</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <FR label="種別"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})} style={inp}>{Object.entries(LOG_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FR>
      <FR label="実施日"><DateSelect value={form.date} onChange={v=>setForm({...form,date:v})}/></FR>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
      <FR label="支払い金額（円）"><input type="number" placeholder="例：15000" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} style={inp}/></FR>
      <FR label="支払い先"><input type="text" placeholder="例：○○整備" value={form.payee} onChange={e=>setForm({...form,payee:e.target.value})} style={inp}/></FR>
    </div>
    <FR label="メモ（任意）"><input type="text" placeholder="例：45230kmで交換" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} style={inp}/></FR>
    <div style={{display:"flex",gap:8}}><button onClick={()=>onSave({...form,carId:car.id})} style={btn}>追加</button><button onClick={onClose} style={btn2}>閉じる</button></div>
  </div>;
}
function InspForm({carId,initPrev,initNext,onSave,onClose}){
  const [prev,setPrev]=useState(initPrev);
  const [next,setNext]=useState(initNext);
  return <div style={{background:C.bgForm,borderTop:`1px solid ${C.yellow}44`,padding:"18px 20px"}}>
    <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── 車検日を入力</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
      <FR label="前回車検日"><DateSelect value={prev} onChange={setPrev}/></FR>
      <FR label="次回車検日"><DateSelect value={next} onChange={setNext}/></FR>
    </div>
    <div style={{display:"flex",gap:8}}><button onClick={()=>onSave(carId,prev,next)} style={btn}>保存</button><button onClick={onClose} style={btn2}>閉じる</button></div>
  </div>;
}
function InsuranceForm({carId,initAmount,initNote,onSave,onClose}){
  const [amount,setAmount]=useState(initAmount);
  const [note,setNote]=useState(initNote);
  return <div style={{background:"#0a1628",borderTop:`1px solid ${C.blue}44`,padding:"18px 20px"}}>
    <div style={{color:C.blue,fontSize:11,letterSpacing:2,marginBottom:14}}>── 🛡️ 保険情報を入力</div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
      <FR label="保険金額（円/月）"><input type="number" placeholder="例：6600" value={amount} onChange={e=>setAmount(e.target.value)} style={inp}/></FR>
      <FR label="保険詳細（保険会社・プランなど）"><input type="text" placeholder="例：○○損保 エコノミー" value={note} onChange={e=>setNote(e.target.value)} style={inp}/></FR>
    </div>
    <div style={{display:"flex",gap:8}}><button onClick={()=>onSave(carId,amount,note)} style={{...btn,background:C.blue}}>保存</button><button onClick={onClose} style={btn2}>閉じる</button></div>
  </div>;
}

/* ═══════════════════ MAIN APP ═══════════════════ */
export default function App(){
  const [tab,setTab]=useState("dashboard");
  const [cars,setCars]=useState([]);
  const [classes,setClasses]=useState([]);
  const [carData,setCarData]=useState({});
  const [logs,setLogs]=useState([]);
  const [loading,setLoading]=useState(true);
  const [notif,setNotif]=useState("");

  // フィルター
  const [dashClassFilter,setDashClassFilter]=useState("all");
  const [dashStatusFilter,setDashStatusFilter]=useState("all");

  // UI状態
  const [showCarForm,setShowCarForm]=useState(false);
  const [showCsvForm,setShowCsvForm]=useState(false);
  const [showClassForm,setShowClassForm]=useState(false);
  const [confirmDel,setConfirmDel]=useState(null);
  const [confirmDelClass,setConfirmDelClass]=useState(null);
  const [detailId,setDetailId]=useState(null);
  const [editCar,setEditCar]=useState(null);
  const [editClass,setEditClass]=useState(null);
  const [openLogCarId,setOpenLogCarId]=useState(null);
  const [milCarId,setMilCarId]=useState(null);
  const [inspCarId,setInspCarId]=useState(null);
  const [insuranceCarId,setInsuranceCarId]=useState(null);
  const [logCarFilter,setLogCarFilter]=useState(null);
  const [editLogId,setEditLogId]=useState(null);
  const [editLogForm,setEditLogForm]=useState({type:"oil",date:"",amount:"",payee:"",note:""});

  // フォーム
  const [carForm,setCarForm]=useState({name:"",plate:"",type:"",status:"active",classId:"",insuranceAmount:"",insuranceNote:""});
  const [classForm,setClassForm]=useState({name:"",color:CLASS_COLORS[0]});
  const [milForm,setMilForm]=useState({mileage:"",month:new Date().toISOString().slice(0,7)});
  const [csvRows,setCsvRows]=useState([]);
  const [csvErr,setCsvErr]=useState("");

  // ログフィルター
  const [logViewMode,setLogViewMode]=useState("car");
  const [logMonthFilter,setLogMonthFilter]=useState(new Date().toISOString().slice(0,7));
  const [logYearFilter,setLogYearFilter]=useState(new Date().getFullYear());

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);
    try{
      // ── Supabase から全データを並列取得 ──
      const [r1,r2,r3,r4] = await Promise.all([
        supabase.from("cars").select("*").order("created_at"),
        supabase.from("car_data").select("*"),
        supabase.from("logs").select("*").order("created_at",{ascending:false}),
        supabase.from("classes").select("*").order("created_at"),
      ]);
      if(r1.data) setCars(r1.data.map(row=>({
        id:row.id, name:row.name, plate:row.plate, type:row.type||"",
        status:row.status||"active", classId:row.class_id||"",
        insuranceAmount:row.insurance_amount||"", insuranceNote:row.insurance_note||""
      })));
      if(r2.data){
        const d={};
        r2.data.forEach(row=>{
          d[row.car_id]={
            currentMileage:row.current_mileage||null,
            lastUpdated:row.last_updated||"",
            prevInspectionDate:row.prev_inspection_date||"",
            inspectionDate:row.inspection_date||"",
            mileageHistory:row.mileage_history||{}
          };
        });
        setCarData(d);
      }
      if(r3.data) setLogs(r3.data.map(row=>({
        id:row.id, carId:row.car_id, type:row.type, date:row.date,
        amount:row.amount||0, payee:row.payee||"", note:row.note||""
      })));
      if(r4.data) setClasses(r4.data.map(row=>({
        id:row.id, name:row.name, color:row.color
      })));
    }catch(e){ console.error("load error:",e); }
    setLoading(false);
  }
  function notify(m){setNotif(m);setTimeout(()=>setNotif(""),2500);}

  // ── Supabase 書き込みヘルパー（エラーはコンソールに出すだけ） ──
  async function saveCarsS(cars){
    // 全件upsert（差分更新）
    const rows = cars.map(c=>({
      id:c.id, name:c.name, plate:c.plate, type:c.type||"",
      status:c.status||"active", class_id:c.classId||"",
      insurance_amount:c.insuranceAmount||"", insurance_note:c.insuranceNote||""
    }));
    const {error} = await supabase.from("cars").upsert(rows);
    if(error) console.error("saveCars:",error);
  }
  async function saveDataS(carData){
    const rows = Object.entries(carData).map(([carId,d])=>({
      car_id:carId,
      current_mileage:d.currentMileage||null,
      last_updated:d.lastUpdated||null,
      prev_inspection_date:d.prevInspectionDate||"",
      inspection_date:d.inspectionDate||"",
      mileage_history:d.mileageHistory||{}
    }));
    const {error} = await supabase.from("car_data").upsert(rows);
    if(error) console.error("saveData:",error);
  }
  async function saveLogsS(logs){
    // logsはappendのみなのでここでは使わない（addLog/delLogで個別処理）
  }
  async function saveClassesS(classes){
    const rows = classes.map(c=>({id:c.id,name:c.name,color:c.color}));
    const {error} = await supabase.from("classes").upsert(rows);
    if(error) console.error("saveClasses:",error);
  }

  // クラスヘルパー
  function getClass(id){return classes.find(c=>c.id===id)||null;}
  function clsColor(id){return getClass(id)?.color||C.yellow;}
  function clsName(id){return getClass(id)?.name||"";}

  // クラスCRUD
  function openAddClass(){setEditClass(null);setClassForm({name:"",color:CLASS_COLORS[classes.length%CLASS_COLORS.length]});setShowClassForm(true);}
  function openEditClass(c){setEditClass(c.id);setClassForm({name:c.name,color:c.color});setShowClassForm(true);}
  async function saveClass(){
    if(!classForm.name)return;
    let nc;
    if(editClass){
      nc=classes.map(c=>c.id===editClass?{...c,...classForm}:c);
      await supabase.from("classes").upsert({id:editClass,name:classForm.name,color:classForm.color});
      notify("クラスを更新しました ✓");
    } else {
      const newId=`cls${Date.now()}`;
      nc=[...classes,{id:newId,name:classForm.name,color:classForm.color}];
      await supabase.from("classes").insert({id:newId,name:classForm.name,color:classForm.color});
      notify("クラスを追加しました ✓");
    }
    setClasses(nc);setShowClassForm(false);setEditClass(null);
  }
  async function deleteClass(id){
    await supabase.from("classes").delete().eq("id",id);
    // 紐づく車両のclass_idをクリア
    await supabase.from("cars").update({class_id:""}).eq("class_id",id);
    const nc=classes.filter(c=>c.id!==id);setClasses(nc);
    const nv=cars.map(c=>c.classId===id?{...c,classId:""}:c);setCars(nv);
    setConfirmDelClass(null);notify("クラスを削除しました");
  }

  // 車両CRUD
  function openAdd(){setEditCar(null);setCarForm({name:"",plate:"",type:"",status:"active",classId:"",insuranceAmount:"",insuranceNote:""});setShowCarForm(true);setShowCsvForm(false);}
  function openEdit(car){setEditCar(car.id);setCarForm({name:car.name,plate:car.plate,type:car.type||"",status:car.status||"active",classId:car.classId||"",insuranceAmount:car.insuranceAmount||"",insuranceNote:car.insuranceNote||""});setShowCarForm(true);setShowCsvForm(false);}
  function openCsv(){setShowCsvForm(!showCsvForm);setShowCarForm(false);setCsvRows([]);setCsvErr("");}
  async function saveCar(){
    if(!carForm.name||!carForm.plate)return;
    let nc;
    if(editCar){
      nc=cars.map(c=>c.id===editCar?{...c,...carForm}:c);
      const row={id:editCar,name:carForm.name,plate:carForm.plate,type:carForm.type||"",status:carForm.status||"active",class_id:carForm.classId||"",insurance_amount:carForm.insuranceAmount||"",insurance_note:carForm.insuranceNote||""};
      const {error}=await supabase.from("cars").upsert(row);
      if(error){console.error("saveCar:",error);notify("保存エラー");return;}
      notify("更新しました ✓");
    } else {
      const newId=`c${Date.now()}`;
      nc=[...cars,{id:newId,...carForm}];
      const row={id:newId,name:carForm.name,plate:carForm.plate,type:carForm.type||"",status:carForm.status||"active",class_id:carForm.classId||"",insurance_amount:carForm.insuranceAmount||"",insurance_note:carForm.insuranceNote||""};
      const {error}=await supabase.from("cars").insert(row);
      if(error){console.error("saveCar:",error);notify("保存エラー");return;}
      notify("追加しました ✓");
    }
    setCars(nc);setShowCarForm(false);setEditCar(null);
  }
  async function deleteCar(id){
    // Supabaseから削除（car_data,logsはCASCADE設定があれば自動、なければ個別削除）
    await Promise.all([
      supabase.from("logs").delete().eq("car_id",id),
      supabase.from("car_data").delete().eq("car_id",id),
      supabase.from("cars").delete().eq("id",id),
    ]);
    const nc=cars.filter(c=>c.id!==id);setCars(nc);
    const nd={...carData};delete nd[id];setCarData(nd);
    const nl=logs.filter(l=>l.carId!==id);setLogs(nl);
    setConfirmDel(null);notify("削除しました");
  }
  async function changeStatus(carId,v){
    const nc=cars.map(c=>c.id===carId?{...c,status:v}:c);
    setCars(nc);
    await supabase.from("cars").update({status:v}).eq("id",carId);
  }
  async function saveInsurance(carId,amount,note){
    const nc=cars.map(c=>c.id===carId?{...c,insuranceAmount:amount,insuranceNote:note}:c);
    setCars(nc);
    await supabase.from("cars").update({insurance_amount:amount,insurance_note:note}).eq("id",carId);
    setInsuranceCarId(null);notify("保険情報を保存しました ✓");
  }

  // CSV
  function handleCsvFile(e){
    const file=e.target.files[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=(ev)=>{
      setCsvErr("");setCsvRows([]);
      const lines=ev.target.result.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length<2){setCsvErr("データが見つかりません");return;}
      const rows=[];const errs=[];
      for(let i=1;i<lines.length;i++){
        const cols=lines[i].split(",").map(c=>c.trim().replace(/^["']|["']$/g,""));
        const [name,plate,mileage,status,classNameCol]=cols;
        if(!name||!plate){errs.push(`${i+1}行目エラー`);continue;}
        const vs=["active","repair","waiting","estimating"];
        const mc=classes.find(c=>c.name===classNameCol);
        rows.push({name,plate,mileage:mileage?parseInt(mileage)||0:0,status:vs.includes(status)?status:"active",classId:mc?mc.id:"",className:classNameCol||""});
      }
      if(errs.length)setCsvErr(errs.join(" | "));
      setCsvRows(rows);
    };
    reader.readAsText(file,"UTF-8");e.target.value="";
  }
  async function importCsv(){
    if(!csvRows.length)return;
    const now=new Date().toISOString();
    const nc=[...cars];const nd={...carData};
    const carRows=[];const dataRows=[];
    csvRows.forEach(row=>{
      const id=`c${Date.now()}_${Math.random().toString(36).slice(2,5)}`;
      nc.push({id,name:row.name,plate:row.plate,type:"",status:row.status||"active",classId:row.classId||""});
      carRows.push({id,name:row.name,plate:row.plate,type:"",status:row.status||"active",class_id:row.classId||""});
      if(row.mileage){
        nd[id]={currentMileage:row.mileage,lastUpdated:now,mileageHistory:{[now.slice(0,7)]:row.mileage}};
        dataRows.push({car_id:id,current_mileage:row.mileage,last_updated:now,mileage_history:{[now.slice(0,7)]:row.mileage}});
      }
    });
    await supabase.from("cars").insert(carRows);
    if(dataRows.length) await supabase.from("car_data").insert(dataRows);
    setCars(nc);setCarData(nd);setCsvRows([]);setCsvErr("");setShowCsvForm(false);
    notify(`${csvRows.length}台を一括登録しました ✓`);
  }
  function dlTemplate(){
    const clsStr=classes.length>0?classes.map(c=>c.name).join(" / "):"Aクラス / Bクラス";
    const csv=`車両名,ナンバープレート,登録時走行距離,ステータス,クラス名\nアルファード 001,札幌 300 あ 1001,45000,active,${classes[0]?.name||"Aクラス"}\nヴェルファイア 001,札幌 300 い 2001,32000,active,${classes[0]?.name||"Aクラス"}\nハイエース 001,札幌 400 う 3001,,repair,${classes[1]?.name||"Bクラス"}\n# クラス名は登録済みのクラスと完全一致が必要。現在: ${clsStr}`;
    const a=document.createElement("a");a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(csv);a.download="車両登録テンプレート.csv";a.click();
  }

  // 走行距離
  async function saveMil(carId,mileage,month){
    if(!carId||!mileage)return;
    const nd={...carData};if(!nd[carId])nd[carId]={};if(!nd[carId].mileageHistory)nd[carId].mileageHistory={};
    nd[carId].mileageHistory[month]=parseInt(mileage);nd[carId].currentMileage=parseInt(mileage);nd[carId].lastUpdated=new Date().toISOString();
    setCarData(nd);
    // mileage_historyはJSONBなのでマージして保存
    const newHist={...nd[carId].mileageHistory};
    const {error}=await supabase.from("car_data").upsert({
      car_id:carId,
      current_mileage:parseInt(mileage),
      last_updated:new Date().toISOString(),
      mileage_history:newHist,
      prev_inspection_date:nd[carId].prevInspectionDate||"",
      inspection_date:nd[carId].inspectionDate||""
    });
    if(error) console.error("saveMil:",error);
    setMilCarId(null);setMilForm({mileage:"",month:new Date().toISOString().slice(0,7)});notify("走行距離を保存しました ✓");
  }

  // 車検
  async function saveInsp(carId,prev,next){
    const nd={...carData};if(!nd[carId])nd[carId]={};
    nd[carId].inspectionDate=next||"";nd[carId].prevInspectionDate=prev||"";
    setCarData(nd);
    const {error}=await supabase.from("car_data").upsert({
      car_id:carId,
      current_mileage:nd[carId].currentMileage||null,
      last_updated:nd[carId].lastUpdated||null,
      prev_inspection_date:prev||"",
      inspection_date:next||"",
      mileage_history:nd[carId].mileageHistory||{}
    });
    if(error) console.error("saveInsp:",error);
    setInspCarId(null);notify("車検日を保存しました ✓");
  }

  // 整備ログ
  async function addLog(data){
    const newId=Date.now().toString();
    const logObj={id:newId,...data,amount:data.amount?parseInt(data.amount):0,createdAt:new Date().toISOString()};
    const nl=[logObj,...logs];
    setLogs(nl);
    const {error}=await supabase.from("logs").insert({
      id:newId, car_id:data.carId, type:data.type, date:data.date,
      amount:data.amount?parseInt(data.amount):0, payee:data.payee||"", note:data.note||""
    });
    if(error) console.error("addLog:",error);
    setOpenLogCarId(null);notify("整備ログを追加しました ✓");
  }
  async function delLog(id){
    const nl=logs.filter(l=>l.id!==id);
    setLogs(nl);
    await supabase.from("logs").delete().eq("id",id);
    notify("削除しました");
  }
  function openEditLog(log){
    setEditLogId(log.id);
    setEditLogForm({type:log.type||"oil",date:log.date||"",amount:log.amount?String(log.amount):"",payee:log.payee||"",note:log.note||""});
  }
  async function updateLog(){
    if(!editLogId)return;
    const updated={type:editLogForm.type,date:editLogForm.date,amount:editLogForm.amount?parseInt(editLogForm.amount):0,payee:editLogForm.payee||"",note:editLogForm.note||""};
    setLogs(logs.map(l=>l.id===editLogId?{...l,...updated}:l));
    const {error}=await supabase.from("logs").update({type:updated.type,date:updated.date,amount:updated.amount,payee:updated.payee,note:updated.note}).eq("id",editLogId);
    if(error)console.error("updateLog:",error);
    setEditLogId(null);notify("整備ログを更新しました ✓");
  }

  // アラート・集計
  function oilKm(id){const d=carData[id];if(!d?.currentMileage)return null;const last=[...logs].filter(l=>l.carId===id&&l.type==="oil").sort((a,b)=>new Date(b.date)-new Date(a.date))[0];const base=last?(carData[id]?.mileageHistory?.[last.date.slice(0,7)]||d.currentMileage-1000):d.currentMileage;return base+5000;}
  function isOilAlert(id){const k=oilKm(id),c=carData[id]?.currentMileage;return k&&c?c>=k-500:false;}
  function inspAlert(id){const dt=carData[id]?.inspectionDate;if(!dt)return null;const d=daysUntil(dt);return d<=60?d:null;}
  function totalAmount(carId){return logs.filter(l=>l.carId===carId).reduce((s,l)=>s+(l.amount||0),0);}

  const alertCars=cars.filter(c=>isOilAlert(c.id)||inspAlert(c.id)!==null);
  const allMonths=[...new Set(logs.map(l=>getYM(l.date)).filter(Boolean))].sort().reverse();
  const allCalYears=[...new Set(logs.map(l=>getCalYear(l.date)).filter(Boolean))].sort().reverse();

  // ダッシュボード絞り込み
  const byClass=dashClassFilter==="all"?cars:cars.filter(c=>c.classId===dashClassFilter);
  const filteredCars=dashStatusFilter==="all"?byClass:byClass.filter(c=>(c.status||"active")===dashStatusFilter);
  const statusCount=Object.keys(STATUS).reduce((acc,k)=>({...acc,[k]:byClass.filter(c=>(c.status||"active")===k).length}),{});
  const filteredByMonth=logs.filter(l=>getYM(l.date)===logMonthFilter);
  const filteredByYear=logs.filter(l=>getCalYear(l.date)===logYearFilter);

  if(loading)return <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.yellow,fontFamily:"monospace",fontSize:18}}>Loading...</div></div>;

  const TABS=[
    {id:"dashboard",label:"ダッシュボード"},
    {id:"classes",  label:`クラス管理 (${classes.length})`},
    {id:"cars",     label:`車両管理 (${cars.length})`},
    {id:"mileage",  label:"走行距離"},
    {id:"logs",     label:"整備ログ"},
    {id:"inspection",label:"車検管理"},
  ];

  const detailCar=cars.find(c=>c.id===detailId);

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.textPri,fontFamily:"'Courier New',monospace"}}>

      {/* 車両削除確認 */}
      {confirmDel&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,12,26,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:C.bgCard,border:`1px solid ${C.danger}`,borderRadius:6,padding:32,maxWidth:380,width:"90%"}}>
            <div style={{color:C.danger,fontSize:14,marginBottom:12}}>⚠️ 削除確認</div>
            <div style={{color:C.textSec,fontSize:13,marginBottom:24,lineHeight:1.8}}>「{cars.find(c=>c.id===confirmDel)?.name}」を削除します。<br/>関連ログも全て削除されます。</div>
            <div style={{display:"flex",gap:8}}><button onClick={()=>deleteCar(confirmDel)} style={{...btn,background:C.danger}}>削除する</button><button onClick={()=>setConfirmDel(null)} style={btn2}>キャンセル</button></div>
          </div>
        </div>
      )}

      {/* クラス削除確認 */}
      {confirmDelClass&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,12,26,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300}}>
          <div style={{background:C.bgCard,border:`1px solid ${C.danger}`,borderRadius:6,padding:32,maxWidth:380,width:"90%"}}>
            <div style={{color:C.danger,fontSize:14,marginBottom:12}}>⚠️ クラス削除確認</div>
            <div style={{color:C.textSec,fontSize:13,marginBottom:24,lineHeight:1.8}}>「{classes.find(c=>c.id===confirmDelClass)?.name}」を削除します。<br/>このクラスに属する車両のクラス設定はクリアされます。</div>
            <div style={{display:"flex",gap:8}}><button onClick={()=>deleteClass(confirmDelClass)} style={{...btn,background:C.danger}}>削除する</button><button onClick={()=>setConfirmDelClass(null)} style={btn2}>キャンセル</button></div>
          </div>
        </div>
      )}

      {/* 詳細モーダル */}
      {detailCar&&(()=>{
        const car=detailCar;const d=carData[car.id]||{};
        const oa=isOilAlert(car.id),ia=inspAlert(car.id),okm=oilKm(car.id);
        const carLogs=logs.filter(l=>l.carId===car.id);const total=totalAmount(car.id);
        const days=d.inspectionDate?daysUntil(d.inspectionDate):null;
        const iSt=days===null?"未設定":days<=0?"期限切れ":days<=30?"要注意":days<=60?"注意":"正常";
        const iCol={未設定:C.textMuted,期限切れ:C.danger,要注意:C.danger,注意:C.warn,正常:C.success}[iSt];
        const cls=getClass(car.classId);
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(5,12,26,0.94)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:200,overflowY:"auto",padding:"24px 16px"}}>
            <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:8,width:"100%",maxWidth:700,marginBottom:24}}>
              <div style={{background:C.header,borderBottom:`2px solid ${C.yellow}`,borderRadius:"8px 8px 0 0",padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6,flexWrap:"wrap"}}>
                    <div style={{color:C.yellow,fontWeight:"bold",fontSize:20}}>{car.name}</div>
                    <StatusBadge status={car.status||"active"} size="lg"/>
                    {cls&&<ClassBadge name={cls.name} color={cls.color} size="lg"/>}
                  </div>
                  <Plate plate={car.plate} size="md"/>
                </div>
                <button onClick={()=>setDetailId(null)} style={{background:"none",border:`1px solid ${C.border}`,color:C.textSec,cursor:"pointer",fontSize:18,width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
              </div>
              <div style={{padding:24,display:"flex",flexDirection:"column",gap:20}}>
                <section>
                  <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── 車両情報</div>
                  <div style={{background:C.bgForm,borderRadius:6,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>車両名</div><div style={{color:C.textPri,fontSize:14,fontWeight:"bold"}}>{car.name}</div></div>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>ナンバー</div><Plate plate={car.plate} size="sm"/></div>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>クラス</div>{cls?<ClassBadge name={cls.name} color={cls.color}/>:<span style={{color:C.textMuted,fontSize:12}}>未設定</span>}</div>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:8}}>ステータス</div><StatusSelect value={car.status||"active"} onChange={v=>changeStatus(car.id,v)}/></div>
                  </div>
                </section>
                {(car.insuranceAmount||car.insuranceNote)&&(
                  <section>
                    <div style={{color:C.blue,fontSize:11,letterSpacing:2,marginBottom:12}}>── 🛡️ 保険情報</div>
                    <div style={{background:"#0a1628",border:`1px solid ${C.blue}33`,borderRadius:6,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                      <div>
                        <div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>保険金額</div>
                        <div style={{color:C.blue,fontSize:18,fontWeight:"bold"}}>{car.insuranceAmount?fmtYen(parseInt(car.insuranceAmount)):"未設定"}<span style={{color:C.textMuted,fontSize:11,marginLeft:4}}>/ 月</span></div>
                        {car.insuranceAmount&&<div style={{color:C.textMuted,fontSize:12,marginTop:2}}>年間：<span style={{color:C.blue}}>{fmtYen(parseInt(car.insuranceAmount)*12)}</span></div>}
                      </div>
                      <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>保険詳細</div><div style={{color:C.textSec,fontSize:13}}>{car.insuranceNote||"—"}</div></div>
                    </div>
                  </section>
                )}
                <section>
                  <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── 走行距離</div>
                  <div style={{background:C.bgForm,borderRadius:6,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>現在走行距離</div><div style={{color:C.textPri,fontSize:18,fontWeight:"bold"}}>{d.currentMileage?`${d.currentMileage.toLocaleString()} km`:<span style={{color:C.textMuted,fontSize:13}}>未入力</span>}</div></div>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>オイル交換目安</div><div style={{color:oa?C.danger:C.textPri,fontSize:18,fontWeight:"bold"}}>{okm?`${okm.toLocaleString()} km`:"—"}</div>{oa&&<div style={{color:C.danger,fontSize:10}}>⚠️ 交換時期！</div>}</div>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>最終入力日</div><div style={{color:C.textSec,fontSize:13}}>{d.lastUpdated?(()=>{const dt=new Date(d.lastUpdated);return`${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`;})():"—"}</div></div>
                  </div>
                </section>
                <section>
                  <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── 車検管理</div>
                  <div style={{background:C.bgForm,borderRadius:6,padding:16,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>前回車検日</div><div style={{color:C.textSec,fontSize:14}}>{formatDate(d.prevInspectionDate)}</div></div>
                    <div><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>次回車検日</div><div style={{color:C.textPri,fontSize:14,fontWeight:"bold"}}>{formatDate(d.inspectionDate)}</div></div>
                    <div style={{textAlign:"center"}}><div style={{color:iCol,fontWeight:"bold",fontSize:16}}>{iSt}</div>{days!==null&&<div style={{color:C.textMuted,fontSize:11}}>{days>0?`あと${days}日`:`${Math.abs(days)}日超過`}</div>}</div>
                  </div>
                </section>
                <section>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{color:C.yellow,fontSize:11,letterSpacing:2}}>── 整備ログ（{carLogs.length}件）</div>
                    {total>0&&<div style={{color:C.warn,fontWeight:"bold",fontSize:13}}>累計：{fmtYen(total)}</div>}
                  </div>
                  {carLogs.length===0?<div style={{color:C.textMuted,textAlign:"center",padding:24,background:C.bgForm,borderRadius:6}}>整備ログがありません</div>:(
                    <div style={{maxHeight:280,overflowY:"auto",display:"flex",flexDirection:"column",gap:8}}>
                      {carLogs.map(log=>{const t=LOG_TYPES[log.type];const isEd=editLogId===log.id;return(
                        <div key={log.id} style={{background:isEd?"#0f1f3a":C.bgForm,border:`1px solid ${isEd?C.yellow:C.border}`,borderLeft:`3px solid ${isEd?C.yellow:t?.color}`,borderRadius:4,overflow:"hidden"}}>
                          {isEd?(
                            <div style={{padding:"14px 16px"}}>
                              <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── ログを編集</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                                <FR label="種別"><select value={editLogForm.type} onChange={e=>setEditLogForm({...editLogForm,type:e.target.value})} style={inp}>{Object.entries(LOG_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FR>
                                <FR label="実施日"><DateSelect value={editLogForm.date} onChange={v=>setEditLogForm({...editLogForm,date:v})}/></FR>
                              </div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                                <FR label="金額（円）"><input type="number" value={editLogForm.amount} onChange={e=>setEditLogForm({...editLogForm,amount:e.target.value})} style={inp} placeholder="例：15000"/></FR>
                                <FR label="支払い先"><input type="text" value={editLogForm.payee} onChange={e=>setEditLogForm({...editLogForm,payee:e.target.value})} style={inp} placeholder="例：○○整備"/></FR>
                              </div>
                              <FR label="メモ"><input type="text" value={editLogForm.note} onChange={e=>setEditLogForm({...editLogForm,note:e.target.value})} style={inp} placeholder="メモ"/></FR>
                              <div style={{display:"flex",gap:8,marginTop:4}}><button onClick={updateLog} style={btn}>保存</button><button onClick={()=>setEditLogId(null)} style={btn2}>キャンセル</button></div>
                            </div>
                          ):(
                            <div style={{padding:"12px 16px",display:"flex",gap:12,alignItems:"flex-start"}}>
                              <span style={{fontSize:18}}>{t?.icon}</span>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:t?.color,fontSize:13,fontWeight:"bold"}}>{t?.label}</span><span style={{color:C.textMuted,fontSize:11}}>{log.date}</span></div>
                                {log.payee&&<div style={{color:C.textSec,fontSize:11}}>📍 {log.payee}</div>}
                                {log.note&&<div style={{color:C.textSec,fontSize:11}}>{log.note}</div>}
                                {log.amount>0&&<div style={{color:C.warn,fontSize:12,fontWeight:"bold",marginTop:4}}>{fmtYen(log.amount)}</div>}
                              </div>
                              <button onClick={()=>openEditLog(log)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,padding:"2px 4px",flexShrink:0}}>✏️</button>
                            </div>
                          )}
                        </div>
                      );})}
                    </div>
                  )}
                </section>
              </div>
              <div style={{borderTop:`1px solid ${C.border}`,padding:"16px 24px",display:"flex",justifyContent:"flex-end"}}><button onClick={()=>setDetailId(null)} style={btn2}>閉じる</button></div>
            </div>
          </div>
        );
      })()}

      {/* ヘッダー */}
      <div style={{background:C.header,borderBottom:`2px solid ${C.yellow}`,padding:"14px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{background:C.yellow,color:"#000",padding:"5px 12px",fontWeight:"bold",fontSize:14,letterSpacing:2,borderRadius:2}}>HANDYMAN</div>
          <span style={{color:C.textMuted,fontSize:12,letterSpacing:2}}>FLEET MANAGER</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          {alertCars.length>0&&<div style={{background:C.danger,color:"#fff",borderRadius:20,padding:"4px 12px",fontSize:12,fontWeight:"bold"}}>⚠️ {alertCars.length}件</div>}
          {notif&&<span style={{color:C.success,fontSize:12}}>{notif}</span>}
        </div>
      </div>

      {/* タブ */}
      <div style={{display:"flex",background:C.tab,borderBottom:`1px solid ${C.border}`,overflowX:"auto"}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"13px 22px",background:"none",border:"none",color:tab===t.id?C.yellow:C.textMuted,borderBottom:tab===t.id?`2px solid ${C.yellow}`:"2px solid transparent",cursor:"pointer",fontSize:12,letterSpacing:1,fontFamily:"inherit",whiteSpace:"nowrap",fontWeight:tab===t.id?"bold":"normal"}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:24,maxWidth:1040,margin:"0 auto"}}>

        {/* ══ DASHBOARD ══ */}
        {tab==="dashboard"&&(
          <div>
            {/* クラスフィルター */}
            <div style={{background:C.bgForm,border:`1px solid ${C.border}`,borderRadius:8,padding:"14px 18px",marginBottom:16}}>
              <div style={{color:C.textMuted,fontSize:10,letterSpacing:2,marginBottom:10}}>◆ クラスで絞り込む</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={()=>setDashClassFilter("all")}
                  style={{background:dashClassFilter==="all"?`${C.yellow}22`:"none",border:`1px solid ${dashClassFilter==="all"?C.yellow:C.border}`,color:dashClassFilter==="all"?C.yellow:C.textMuted,padding:"7px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:12,borderRadius:3,fontWeight:dashClassFilter==="all"?"bold":"normal"}}>
                  全クラス <span style={{fontSize:10,opacity:0.7}}>({cars.length}台)</span>
                </button>
                {classes.map(cls=>{
                  const cnt=cars.filter(c=>c.classId===cls.id).length;
                  const isA=dashClassFilter===cls.id;
                  return(
                    <button key={cls.id} onClick={()=>setDashClassFilter(isA?"all":cls.id)}
                      style={{background:isA?`${cls.color}22`:"none",border:`1px solid ${isA?cls.color:C.border}`,color:isA?cls.color:C.textMuted,padding:"7px 16px",cursor:"pointer",fontFamily:"inherit",fontSize:12,borderRadius:3,fontWeight:isA?"bold":"normal"}}>
                      ◆ {cls.name} <span style={{fontSize:10,opacity:0.7}}>({cnt}台)</span>
                    </button>
                  );
                })}
                {classes.length===0&&<span style={{color:C.textMuted,fontSize:11,padding:"7px 0"}}>「クラス管理」タブでクラスを登録すると絞り込みできます</span>}
              </div>
            </div>

            {/* ステータスサマリー */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
              <div onClick={()=>setDashStatusFilter("all")} style={{background:dashStatusFilter==="all"?C.bgCard:C.bgForm,border:`1px solid ${dashStatusFilter==="all"?C.yellow:C.border}`,borderRadius:6,padding:"12px 16px",cursor:"pointer",textAlign:"center"}}>
                <div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>{dashClassFilter==="all"?"全車両":clsName(dashClassFilter)}</div>
                <div style={{color:C.yellow,fontSize:22,fontWeight:"bold"}}>{byClass.length}</div>
                <div style={{color:C.textMuted,fontSize:10}}>台</div>
              </div>
              {Object.entries(STATUS).map(([k,v])=>(
                <div key={k} onClick={()=>setDashStatusFilter(dashStatusFilter===k?"all":k)} style={{background:dashStatusFilter===k?v.bg:C.bgForm,border:`1px solid ${dashStatusFilter===k?v.color:C.border}`,borderRadius:6,padding:"12px 16px",cursor:"pointer",textAlign:"center"}}>
                  <div style={{fontSize:18,marginBottom:2}}>{v.icon}</div>
                  <div style={{color:v.color,fontSize:10,marginBottom:4}}>{v.label}</div>
                  <div style={{color:statusCount[k]>0?v.color:C.textMuted,fontSize:22,fontWeight:"bold"}}>{statusCount[k]}</div>
                  <div style={{color:C.textMuted,fontSize:10}}>台</div>
                </div>
              ))}
            </div>

            {/* 保険総額 */}
            {(()=>{
              const src=dashClassFilter==="all"?cars:cars.filter(c=>c.classId===dashClassFilter);
              const total=src.reduce((s,c)=>s+(c.insuranceAmount?parseInt(c.insuranceAmount)||0:0),0);
              const cnt=src.filter(c=>c.insuranceAmount&&parseInt(c.insuranceAmount)>0).length;
              if(total===0)return null;
              return(
                <div style={{background:"#0a1628",border:`1px solid ${C.blue}44`,borderRadius:8,padding:"14px 20px",marginBottom:16,display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                  <div style={{fontSize:22}}>🛡️</div>
                  <div style={{flex:1}}>
                    <div style={{color:C.blue,fontSize:10,letterSpacing:2,marginBottom:4}}>保険月額総額（{cnt}台分）</div>
                    <div style={{color:C.textPri,fontSize:22,fontWeight:"bold"}}>{fmtYen(total)}<span style={{color:C.textMuted,fontSize:11,marginLeft:6}}>/ 月</span></div>
                    <div style={{color:C.textMuted,fontSize:12,marginTop:4}}>年間：<span style={{color:C.blue,fontWeight:"bold"}}>{fmtYen(total*12)}</span></div>
                  </div>
                  <div style={{textAlign:"right"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>1台平均（月）</div><div style={{color:C.blue,fontSize:16,fontWeight:"bold"}}>{fmtYen(Math.round(total/cnt))}</div><div style={{color:C.textMuted,fontSize:11,marginTop:2}}>年：{fmtYen(Math.round(total/cnt)*12)}</div></div>
                </div>
              );
            })()}

            {/* 見出し */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <h2 style={{color:C.yellow,fontSize:13,letterSpacing:3,fontWeight:"normal"}}>
                ── {dashClassFilter==="all"?"全車両":clsName(dashClassFilter)}{dashStatusFilter!=="all"&&` / ${STATUS[dashStatusFilter]?.label}`}
                <span style={{color:C.textMuted,fontSize:11,marginLeft:8}}>({filteredCars.length}台)</span>
              </h2>
              {(dashClassFilter!=="all"||dashStatusFilter!=="all")&&<button onClick={()=>{setDashClassFilter("all");setDashStatusFilter("all");}} style={{...btn2,fontSize:11,padding:"4px 12px"}}>✕ 解除</button>}
            </div>

            {filteredCars.length===0?(
              <div style={{color:C.textMuted,textAlign:"center",padding:60}}><div style={{fontSize:32,marginBottom:12}}>🚗</div><div>車両が見つかりません</div><button onClick={()=>setTab("cars")} style={{...btn,marginTop:16}}>車両を追加する →</button></div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:16}}>
                {filteredCars.map(car=>{
                  const d=carData[car.id]||{};
                  const oa=isOilAlert(car.id),ia=inspAlert(car.id),okm=oilKm(car.id);
                  const recentLogs=logs.filter(l=>l.carId===car.id).slice(0,2);
                  const hasAlert=oa||ia!==null;
                  const total=totalAmount(car.id);
                  const cls=getClass(car.classId);
                  const isLogOpen=openLogCarId===car.id;
                  return(
                    <div key={car.id} style={{background:C.bgCard,border:`1px solid ${hasAlert?C.danger:isLogOpen?C.yellow:C.border}`,borderRadius:6,overflow:"hidden",position:"relative",transition:"border-color 0.15s"}}
                      onMouseEnter={e=>{if(!isLogOpen)e.currentTarget.style.borderColor=hasAlert?C.danger:C.yellow;}}
                      onMouseLeave={e=>{if(!isLogOpen)e.currentTarget.style.borderColor=hasAlert?C.danger:C.border;}}>
                      <div onClick={()=>setDetailId(car.id)} style={{padding:20,cursor:"pointer"}}>
                        {hasAlert&&<div style={{position:"absolute",top:12,right:12,background:C.danger,color:"#fff",fontSize:10,padding:"2px 8px",borderRadius:10}}>要対応</div>}
                        {cls&&<div style={{marginBottom:8}}><ClassBadge name={cls.name} color={cls.color}/></div>}
                        <div style={{color:C.yellow,fontWeight:"bold",fontSize:17,marginBottom:8}}>{car.name}</div>
                        <div style={{marginBottom:10}} onClick={e=>e.stopPropagation()}><StatusSelect value={car.status||"active"} onChange={v=>changeStatus(car.id,v)}/></div>
                        <div style={{marginBottom:16}}><Plate plate={car.plate} size="lg"/></div>
                        <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14,display:"flex",flexDirection:"column",gap:2}}>
                          <InfoRow label="現在走行距離" value={d.currentMileage?`${d.currentMileage.toLocaleString()} km`:"未入力"}/>
                          <InfoRow label="オイル交換目安" value={okm?`${okm.toLocaleString()} km`:"—"} alert={oa} alertText="交換時期！"/>
                          <InfoRow label="車検期限" value={formatDate(d.inspectionDate)} alert={ia!==null} alertText={ia!==null?(ia<=0?"期限切れ！":`あと${ia}日`):""}/>
                          {total>0&&<InfoRow label="整備累計支出" value={fmtYen(total)}/>}
                        </div>
                        {recentLogs.length>0&&(
                          <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
                            <div style={{color:C.textMuted,fontSize:10,marginBottom:6}}>最近のログ</div>
                            {recentLogs.map(log=>(
                              <div key={log.id} style={{display:"flex",gap:8,alignItems:"center",marginBottom:4}}>
                                <span style={{fontSize:11}}>{LOG_TYPES[log.type]?.icon}</span>
                                <span style={{color:C.textSec,fontSize:11}}>{LOG_TYPES[log.type]?.label}</span>
                                {log.amount>0&&<span style={{color:C.warn,fontSize:10}}>{fmtYen(log.amount)}</span>}
                                <span style={{color:C.textMuted,fontSize:10,marginLeft:"auto"}}>{log.date}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{borderTop:`1px solid ${C.border}`,display:"flex"}}>
                        <button onClick={e=>{e.stopPropagation();setOpenLogCarId(isLogOpen?null:car.id);}} style={{flex:1,background:"none",border:"none",color:isLogOpen?C.yellow:C.textMuted,cursor:"pointer",padding:"10px",fontSize:11,fontFamily:"inherit",borderRight:`1px solid ${C.border}`}}>{isLogOpen?"▲ 閉じる":"+ 整備ログ追加"}</button>
                        <button onClick={()=>setDetailId(car.id)} style={{flex:1,background:"none",border:"none",color:C.textMuted,cursor:"pointer",padding:"10px",fontSize:11,fontFamily:"inherit"}}>詳細を見る →</button>
                      </div>
                      {isLogOpen&&<LogForm car={car} onSave={addLog} onClose={()=>setOpenLogCarId(null)}/>}
                    </div>
                  );
                })}
              </div>
            )}
            {alertCars.length>0&&(
              <div style={{marginTop:32}}>
                <h2 style={{color:C.danger,fontSize:13,letterSpacing:3,marginBottom:16,fontWeight:"normal"}}>── アラート</h2>
                {cars.filter(c=>isOilAlert(c.id)).map(c=>(
                  <div key={c.id} style={{background:"#1f0a0a",border:`1px solid ${C.danger}`,borderRadius:4,padding:"12px 16px",marginBottom:8,fontSize:12,color:"#fca5a5"}}>🛢️ {c.name}：オイル交換時期（{(carData[c.id]?.currentMileage||0).toLocaleString()} km / 目安 {(oilKm(c.id)||0).toLocaleString()} km）</div>
                ))}
                {cars.filter(c=>inspAlert(c.id)!==null).map(c=>{const d=inspAlert(c.id);return<div key={c.id} style={{background:"#1f0a0a",border:`1px solid ${C.danger}`,borderRadius:4,padding:"12px 16px",marginBottom:8,fontSize:12,color:"#fca5a5"}}>📋 {c.name}：車検期限{d<=0?"切れ！":`まであと${d}日`}</div>;})}
              </div>
            )}
          </div>
        )}

        {/* ══ クラス管理 ══ */}
        {tab==="classes"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{color:C.yellow,fontSize:13,letterSpacing:3,fontWeight:"normal"}}>── クラス管理</h2>
              <button onClick={openAddClass} style={btn}>+ クラスを追加</button>
            </div>
            <div style={{background:C.bgForm,border:`1px solid ${C.border}`,borderRadius:6,padding:14,marginBottom:20,fontSize:12,color:C.textSec,lineHeight:1.8}}>
              クラスは車両の大枠グループです。例：Aクラス（グループA用）、Bクラス（法人用）など。<br/>
              ダッシュボードでクラスを選択すると対象クラスのみ表示されます。<br/>
              CSVのクラス名列にクラス名を入力すると一括登録時に自動で紐づきます。
            </div>
            {showClassForm&&(
              <div style={frm}>
                <h3 style={{color:C.yellow,fontSize:13,marginBottom:20,fontWeight:"normal"}}>{editClass?"✏️ クラスを編集":"◆ 新しいクラスを追加"}</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <FR label="クラス名 *"><input type="text" placeholder="例：Aクラス" value={classForm.name} onChange={e=>setClassForm({...classForm,name:e.target.value})} style={inp}/></FR>
                  <FR label="カラー">
                    <div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:4}}>
                      {CLASS_COLORS.map(col=>(
                        <div key={col} onClick={()=>setClassForm({...classForm,color:col})} style={{width:28,height:28,borderRadius:"50%",background:col,cursor:"pointer",border:classForm.color===col?"3px solid #fff":"2px solid transparent",boxSizing:"border-box"}}/>
                      ))}
                    </div>
                  </FR>
                </div>
                {classForm.name&&<div style={{marginBottom:16}}><div style={{color:C.textMuted,fontSize:10,marginBottom:8}}>プレビュー</div><ClassBadge name={classForm.name} color={classForm.color} size="lg"/></div>}
                <div style={{display:"flex",gap:8}}><button onClick={saveClass} style={btn}>{editClass?"更新する":"追加する"}</button><button onClick={()=>{setShowClassForm(false);setEditClass(null);}} style={btn2}>キャンセル</button></div>
              </div>
            )}
            {classes.length===0?(
              <div style={{color:C.textMuted,textAlign:"center",padding:60}}><div style={{fontSize:32,marginBottom:12}}>◆</div><div>「+ クラスを追加」からクラスを作成してください</div></div>
            ):(
              <div style={{display:"grid",gap:12}}>
                {classes.map(cls=>{
                  const carsIn=cars.filter(c=>c.classId===cls.id);
                  return(
                    <div key={cls.id} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"18px 24px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                      <div style={{flex:1}}>
                        <div style={{marginBottom:10}}><ClassBadge name={cls.name} color={cls.color} size="lg"/></div>
                        <div style={{color:C.textMuted,fontSize:11}}>登録車両：{carsIn.length}台{carsIn.length>0&&<span style={{marginLeft:8,color:C.textSec}}>{carsIn.slice(0,3).map(c=>c.name).join("・")}{carsIn.length>3&&`…他${carsIn.length-3}台`}</span>}</div>
                      </div>
                      <div style={{display:"flex",gap:8}}><button onClick={()=>openEditClass(cls)} style={btn2}>編集</button><button onClick={()=>setConfirmDelClass(cls.id)} style={btnD}>削除</button></div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ 車両管理 ══ */}
        {tab==="cars"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <h2 style={{color:C.yellow,fontSize:13,letterSpacing:3,fontWeight:"normal"}}>── 車両管理</h2>
              <div style={{display:"flex",gap:8}}>
                <button onClick={openCsv} style={{...btn2,borderColor:showCsvForm?C.yellow:C.border,color:showCsvForm?C.yellow:C.textSec}}>📂 CSV一括登録</button>
                <button onClick={openAdd} style={btn}>+ 車両を追加</button>
              </div>
            </div>
            {showCsvForm&&(
              <div style={frm}>
                <h3 style={{color:C.yellow,fontSize:13,marginBottom:4,fontWeight:"normal"}}>📂 CSV一括登録</h3>
                <div style={{background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:4,padding:14,marginBottom:14,fontSize:12}}>
                  <div style={{color:C.textMuted,fontSize:10,marginBottom:6}}>フォーマット（1行目はヘッダー）</div>
                  <div style={{color:C.yellow}}>車両名, ナンバープレート, 登録時走行距離, ステータス, クラス名</div>
                  <div style={{color:C.textSec,marginTop:4,fontSize:11}}>ステータス: active / repair / waiting / estimating（省略可）</div>
                  <div style={{color:C.textSec,fontSize:11}}>クラス名: 登録済みクラスと完全一致（省略可）</div>
                  {classes.length>0&&<div style={{color:C.textMuted,fontSize:11,marginTop:4}}>現在のクラス: {classes.map(c=>c.name).join(", ")}</div>}
                </div>
                <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
                  <button onClick={dlTemplate} style={btn2}>⬇️ テンプレートDL</button>
                  <label style={{...btn,display:"inline-flex",alignItems:"center",gap:6,cursor:"pointer"}}>📁 CSVファイルを選択<input type="file" accept=".csv" onChange={handleCsvFile} style={{display:"none"}}/></label>
                </div>
                {csvErr&&<div style={{background:"#1f0a0a",border:`1px solid ${C.danger}`,borderRadius:4,padding:12,marginBottom:12,color:"#fca5a5",fontSize:12}}>⚠️ {csvErr}</div>}
                {csvRows.length>0&&(
                  <div>
                    <div style={{color:C.textSec,fontSize:12,marginBottom:10}}>📋 {csvRows.length}件を読み込みました</div>
                    <div style={{overflowX:"auto",marginBottom:14}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                        <thead><tr><th style={thS}>#</th><th style={thS}>車両名</th><th style={thS}>ナンバー</th><th style={thS}>走行距離</th><th style={thS}>ステータス</th><th style={thS}>クラス</th></tr></thead>
                        <tbody>{csvRows.map((row,i)=>(
                          <tr key={i}>
                            <td style={{...tdS,color:C.textMuted}}>{i+1}</td>
                            <td style={{...tdS,color:C.yellow,fontWeight:"bold"}}>{row.name}</td>
                            <td style={tdS}><Plate plate={row.plate} size="sm"/></td>
                            <td style={tdS}>{row.mileage?`${row.mileage.toLocaleString()} km`:<span style={{color:C.textMuted}}>—</span>}</td>
                            <td style={tdS}><StatusBadge status={row.status||"active"}/></td>
                            <td style={tdS}>{row.classId?<ClassBadge name={clsName(row.classId)} color={clsColor(row.classId)}/>:<span style={{color:row.className?C.warn:C.textMuted,fontSize:11}}>{row.className||"未設定"}{row.className&&!row.classId&&" ⚠未登録"}</span>}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                    <div style={{display:"flex",gap:8}}><button onClick={importCsv} style={btn}>✓ {csvRows.length}台を登録する</button><button onClick={()=>{setCsvRows([]);setCsvErr("");}} style={btn2}>クリア</button></div>
                  </div>
                )}
              </div>
            )}
            {showCarForm&&(
              <div style={frm}>
                <h3 style={{color:C.yellow,fontSize:13,marginBottom:20,fontWeight:"normal"}}>{editCar?"✏️ 車両情報を編集":"🚗 新しい車両を追加"}</h3>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  <FR label="車両名 *"><input type="text" placeholder="例：アルファード 001" value={carForm.name} onChange={e=>setCarForm({...carForm,name:e.target.value})} style={inp}/></FR>
                  <FR label="ナンバープレート *"><input type="text" placeholder="例：札幌 300 あ 1001" value={carForm.plate} onChange={e=>setCarForm({...carForm,plate:e.target.value})} style={inp}/></FR>
                  <FR label="クラス">
                    <select value={carForm.classId} onChange={e=>setCarForm({...carForm,classId:e.target.value})} style={inp}>
                      <option value="">未設定</option>
                      {classes.map(c=><option key={c.id} value={c.id}>◆ {c.name}</option>)}
                    </select>
                  </FR>
                  <FR label="ステータス">
                    <select value={carForm.status} onChange={e=>setCarForm({...carForm,status:e.target.value})} style={inp}>
                      {Object.entries(STATUS).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </FR>
                  <FR label="車種・タイプ（任意）"><input type="text" placeholder="例：ミニバン / SUV" value={carForm.type} onChange={e=>setCarForm({...carForm,type:e.target.value})} style={inp}/></FR>
                </div>
                {carForm.plate&&<div style={{marginBottom:16}}><div style={{color:C.textMuted,fontSize:10,marginBottom:8}}>プレビュー</div><Plate plate={carForm.plate} size="md"/></div>}
                <div style={{display:"flex",gap:8}}><button onClick={saveCar} style={btn}>{editCar?"更新する":"追加する"}</button><button onClick={()=>{setShowCarForm(false);setEditCar(null);}} style={btn2}>キャンセル</button></div>
              </div>
            )}
            {cars.length===0?(
              <div style={{color:C.textMuted,textAlign:"center",padding:60}}><div style={{fontSize:32,marginBottom:12}}>🚗</div><div>「車両を追加」または「CSV一括登録」から登録してください</div></div>
            ):(
              <div style={{display:"grid",gap:10}}>
                {cars.map((car,i)=>{
                  const isInsOpen=insuranceCarId===car.id;
                  const cls=getClass(car.classId);
                  return(
                    <div key={car.id} style={{background:C.bgCard,border:`1px solid ${isInsOpen?C.blue:C.border}`,borderRadius:6,overflow:"hidden"}}>
                      <div style={{padding:"16px 20px",display:"flex",alignItems:"center",gap:16,flexWrap:"wrap"}}>
                        <div style={{color:C.textMuted,fontSize:11,minWidth:28,textAlign:"center"}}>#{i+1}</div>
                        <div style={{flex:1,minWidth:160}}>
                          {cls&&<div style={{marginBottom:6}}><ClassBadge name={cls.name} color={cls.color}/></div>}
                          <div style={{color:C.yellow,fontWeight:"bold",fontSize:15,marginBottom:8}}>{car.name}</div>
                          <Plate plate={car.plate} size="md"/>
                          {car.type&&<div style={{color:C.textMuted,fontSize:11,marginTop:6}}>{car.type}</div>}
                        </div>
                        <StatusSelect value={car.status||"active"} onChange={v=>changeStatus(car.id,v)}/>
                        <div style={{textAlign:"right"}}>
                          <div style={{color:C.textMuted,fontSize:10,marginBottom:2}}>走行距離</div>
                          <div style={{color:C.textMuted,fontSize:11}}>{carData[car.id]?.currentMileage?`${carData[car.id].currentMileage.toLocaleString()} km`:"未入力"}</div>
                          {car.insuranceAmount&&parseInt(car.insuranceAmount)>0&&(
                            <div style={{marginTop:6}}>
                              <div style={{color:C.textMuted,fontSize:10,marginBottom:2}}>保険（月額）</div>
                              <div style={{color:C.blue,fontSize:12,fontWeight:"bold"}}>{fmtYen(parseInt(car.insuranceAmount))}</div>
                              <div style={{color:C.textMuted,fontSize:10}}>年：{fmtYen(parseInt(car.insuranceAmount)*12)}</div>
                            </div>
                          )}
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button onClick={()=>setInsuranceCarId(isInsOpen?null:car.id)} style={{...btn2,fontSize:11,padding:"7px 12px",borderColor:isInsOpen?C.blue:C.border,color:isInsOpen?C.blue:C.textSec}}>🛡️ 保険</button>
                          <button onClick={()=>openEdit(car)} style={btn2}>編集</button>
                          <button onClick={()=>setConfirmDel(car.id)} style={btnD}>削除</button>
                        </div>
                      </div>
                      {isInsOpen&&<InsuranceForm carId={car.id} initAmount={car.insuranceAmount||""} initNote={car.insuranceNote||""} onSave={saveInsurance} onClose={()=>setInsuranceCarId(null)}/>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ 走行距離 ══ */}
        {tab==="mileage"&&(
          <div>
            <h2 style={{color:C.yellow,fontSize:13,letterSpacing:3,marginBottom:6,fontWeight:"normal"}}>── 月末走行距離入力</h2>
            <p style={{color:C.textMuted,fontSize:12,marginBottom:20}}>車両を選択して走行距離を入力してください</p>
            {cars.length===0?<div style={{color:C.textMuted,textAlign:"center",padding:40}}>まず「車両管理」タブで車両を登録してください</div>:(
              <div style={{display:"grid",gap:12}}>
                {cars.map(car=>{
                  const d=carData[car.id]||{};
                  const oa=isOilAlert(car.id),okm=oilKm(car.id);
                  const isSel=milCarId===car.id;
                  const cls=getClass(car.classId);
                  return(
                    <div key={car.id} style={{background:C.bgCard,border:`1px solid ${isSel?C.yellow:oa?C.danger:C.border}`,borderRadius:6,overflow:"hidden",boxShadow:isSel?`0 0 14px ${C.yellow}22`:"none"}}>
                      <div onClick={()=>{setMilCarId(isSel?null:car.id);setMilForm({mileage:d.currentMileage||"",month:new Date().toISOString().slice(0,7)});}} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",cursor:"pointer",flexWrap:"wrap"}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${isSel?C.yellow:C.border}`,background:isSel?C.yellow:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{isSel&&<div style={{width:7,height:7,borderRadius:"50%",background:"#000"}}/>}</div>
                        <div style={{flex:1,minWidth:160}}>
                          {cls&&<div style={{marginBottom:6}}><ClassBadge name={cls.name} color={cls.color}/></div>}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{color:C.yellow,fontWeight:"bold",fontSize:15}}>{car.name}</div><StatusBadge status={car.status||"active"}/></div>
                          <Plate plate={car.plate} size="md"/>
                        </div>
                        <div style={{textAlign:"right",minWidth:110}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>現在走行距離</div><div style={{color:C.textPri,fontSize:14,fontWeight:"bold"}}>{d.currentMileage?`${d.currentMileage.toLocaleString()} km`:<span style={{color:C.textMuted,fontSize:12}}>未入力</span>}</div></div>
                        <div style={{textAlign:"right",minWidth:110}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>オイル交換目安</div><div style={{color:oa?C.danger:C.textPri,fontSize:14}}>{okm?`${okm.toLocaleString()} km`:"—"}</div></div>
                        <div style={{minWidth:72,textAlign:"center"}}>{oa?<span style={{color:C.danger,fontSize:11}}>⚠️ 交換時期</span>:d.currentMileage?<span style={{color:C.success,fontSize:11}}>✓ 正常</span>:<span style={{color:C.textMuted,fontSize:11}}>—</span>}</div>
                      </div>
                      {isSel&&(
                        <div style={{background:C.bgForm,borderTop:`1px solid ${C.yellow}44`,padding:"18px 20px",display:"flex",alignItems:"flex-end",gap:12,flexWrap:"wrap"}}>
                          <div style={{flex:1,minWidth:140}}><label style={{display:"block",color:C.textSec,fontSize:11,marginBottom:6}}>対象月</label><MonthSelect value={milForm.month} onChange={v=>setMilForm({...milForm,month:v})}/></div>
                          <div style={{flex:1,minWidth:160}}><label style={{display:"block",color:C.textSec,fontSize:11,marginBottom:6}}>走行距離 (km)</label><input type="number" placeholder="例：45230" value={milForm.mileage} onChange={e=>setMilForm({...milForm,mileage:e.target.value})} style={{...inp,fontSize:16,fontWeight:"bold"}} autoFocus/></div>
                          <div style={{display:"flex",gap:8}}><button onClick={()=>saveMil(car.id,milForm.mileage,milForm.month)} style={btn}>保存</button><button onClick={()=>setMilCarId(null)} style={btn2}>閉じる</button></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ 整備ログ ══ */}
        {tab==="logs"&&(
          <div>
            <h2 style={{color:C.yellow,fontSize:13,letterSpacing:3,marginBottom:20,fontWeight:"normal"}}>── 整備ログ・支出管理</h2>
            <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
              {[{id:"car",label:"🚗 車両別"},{id:"month",label:"📅 月別"},{id:"year",label:"📊 年別"}].map(m=>(
                <button key={m.id} onClick={()=>setLogViewMode(m.id)} style={{...btn2,borderColor:logViewMode===m.id?C.yellow:C.border,color:logViewMode===m.id?C.yellow:C.textMuted,fontWeight:logViewMode===m.id?"bold":"normal"}}>{m.label}</button>
              ))}
            </div>

            {logViewMode==="car"&&(
              <div style={{display:"grid",gap:12}}>
                {cars.length===0?<div style={{color:C.textMuted,textAlign:"center",padding:40}}>まず「車両管理」タブで車両を登録してください</div>:
                cars.map(car=>{
                  const carLogs=logs.filter(l=>l.carId===car.id);
                  const total=totalAmount(car.id);
                  const isOpen=openLogCarId===car.id;
                  const isExp=logCarFilter===car.id;
                  const cls=getClass(car.classId);
                  return(
                    <div key={car.id} style={{background:C.bgCard,border:`1px solid ${isOpen?C.yellow:C.border}`,borderRadius:6,overflow:"hidden"}}>
                      <div style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",flexWrap:"wrap"}}>
                        <div style={{flex:1,minWidth:160}}>
                          {cls&&<div style={{marginBottom:6}}><ClassBadge name={cls.name} color={cls.color}/></div>}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{color:C.yellow,fontWeight:"bold",fontSize:15}}>{car.name}</div><StatusBadge status={car.status||"active"}/></div>
                          <Plate plate={car.plate} size="md"/>
                        </div>
                        <div style={{textAlign:"right"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>整備件数</div><div style={{color:C.textPri,fontSize:18,fontWeight:"bold"}}>{carLogs.length}<span style={{fontSize:11,color:C.textMuted}}>件</span></div></div>
                        <div style={{textAlign:"right",minWidth:120}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>累計支出</div><div style={{color:total>0?C.warn:C.textMuted,fontSize:18,fontWeight:"bold"}}>{total>0?fmtYen(total):"—"}</div></div>
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setOpenLogCarId(isOpen?null:car.id)} style={{...btn,fontSize:11,padding:"7px 14px"}}>+ ログ追加</button>
                          <button onClick={()=>setLogCarFilter(isExp?null:car.id)} style={{...btn2,fontSize:11,padding:"7px 14px"}}>{isExp?"▲ 閉じる":"▼ 履歴"}</button>
                        </div>
                      </div>
                      {isOpen&&<LogForm car={car} onSave={addLog} onClose={()=>setOpenLogCarId(null)}/>}
                      {isExp&&(
                        <div style={{borderTop:`1px solid ${C.border}`,background:C.bgForm}}>
                          {carLogs.length===0?<div style={{color:C.textMuted,textAlign:"center",padding:24}}>整備ログがありません</div>:(
                            <div style={{maxHeight:400,overflowY:"auto"}}>
                              {carLogs.map(log=>{const t=LOG_TYPES[log.type];const isEd=editLogId===log.id;return(
                                <div key={log.id} style={{borderBottom:`1px solid ${C.border}22`,borderLeft:`3px solid ${isEd?C.yellow:t?.color}`}}>
                                  {isEd?(
                                    <div style={{padding:"14px 20px",background:"#0f1f3a"}}>
                                      <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── ログを編集</div>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                                        <FR label="種別"><select value={editLogForm.type} onChange={e=>setEditLogForm({...editLogForm,type:e.target.value})} style={inp}>{Object.entries(LOG_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FR>
                                        <FR label="実施日"><DateSelect value={editLogForm.date} onChange={v=>setEditLogForm({...editLogForm,date:v})}/></FR>
                                      </div>
                                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                                        <FR label="金額（円）"><input type="number" value={editLogForm.amount} onChange={e=>setEditLogForm({...editLogForm,amount:e.target.value})} style={inp} placeholder="例：15000"/></FR>
                                        <FR label="支払い先"><input type="text" value={editLogForm.payee} onChange={e=>setEditLogForm({...editLogForm,payee:e.target.value})} style={inp} placeholder="例：○○整備"/></FR>
                                      </div>
                                      <FR label="メモ"><input type="text" value={editLogForm.note} onChange={e=>setEditLogForm({...editLogForm,note:e.target.value})} style={inp} placeholder="メモ"/></FR>
                                      <div style={{display:"flex",gap:8,marginTop:4}}><button onClick={updateLog} style={btn}>保存</button><button onClick={()=>setEditLogId(null)} style={btn2}>キャンセル</button></div>
                                    </div>
                                  ):(
                                    <div style={{display:"flex",gap:12,padding:"14px 20px",alignItems:"flex-start"}}>
                                      <span style={{fontSize:18}}>{t?.icon}</span>
                                      <div style={{flex:1}}>
                                        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{color:t?.color,fontSize:13,fontWeight:"bold"}}>{t?.label}</span><span style={{color:C.textMuted,fontSize:11}}>{log.date}</span></div>
                                        {log.payee&&<div style={{color:C.textSec,fontSize:11}}>📍 {log.payee}</div>}
                                        {log.note&&<div style={{color:C.textSec,fontSize:11}}>{log.note}</div>}
                                        {log.amount>0&&<div style={{color:C.warn,fontSize:12,fontWeight:"bold",marginTop:4}}>{fmtYen(log.amount)}</div>}
                                      </div>
                                      <div style={{display:"flex",gap:4"}}>
                                        <button onClick={()=>openEditLog(log)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,padding:"2px 6px"}}>✏️</button>
                                        <button onClick={()=>delLog(log.id)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:16,padding:"2px 6px"}}>✕</button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );})}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {logViewMode==="month"&&(()=>{
              const mTotal=filteredByMonth.reduce((s,l)=>s+(l.amount||0),0);
              const maxTypeTotal=Math.max(1,...Object.keys(LOG_TYPES).map(k=>filteredByMonth.filter(l=>l.type===k).reduce((s,l)=>s+(l.amount||0),0)));
              const maxClsTotalM=Math.max(1,...classes.map(cls=>filteredByMonth.filter(l=>{const car=cars.find(v=>v.id===l.carId);return car?.classId===cls.id;}).reduce((s,l)=>s+(l.amount||0),0)));
              return(
              <div>
                <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,flexWrap:"wrap"}}>
                  <MonthSelect value={logMonthFilter} onChange={v=>setLogMonthFilter(v)}/>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{allMonths.slice(0,6).map(m=><button key={m} onClick={()=>setLogMonthFilter(m)} style={{...btn2,fontSize:11,padding:"4px 10px",borderColor:logMonthFilter===m?C.yellow:C.border,color:logMonthFilter===m?C.yellow:C.textMuted}}>{m}</button>)}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:20}}>
                  <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 16px",textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>整備件数</div><div style={{color:C.textPri,fontSize:22,fontWeight:"bold"}}>{filteredByMonth.length}<span style={{fontSize:11,color:C.textMuted}}>件</span></div></div>
                  <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 16px",textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>総支出</div><div style={{color:C.warn,fontSize:22,fontWeight:"bold"}}>{fmtYen(mTotal)}</div></div>
                  <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 16px",textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>対象車両数</div><div style={{color:C.textPri,fontSize:22,fontWeight:"bold"}}>{new Set(filteredByMonth.map(l=>l.carId)).size}<span style={{fontSize:11,color:C.textMuted}}>台</span></div></div>
                </div>
                {filteredByMonth.length>0&&(<>
                  <div style={{background:"#0f1f3a",border:`1px solid ${C.border}`,borderRadius:8,padding:"16px 20px",marginBottom:14}}>
                    <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── 種別別支出内訳</div>
                    <div style={{display:"grid",gap:9}}>
                      {Object.entries(LOG_TYPES).map(([k,t])=>{
                        const tLogs=filteredByMonth.filter(l=>l.type===k);
                        const tTotal=tLogs.reduce((s,l)=>s+(l.amount||0),0);
                        const pct=mTotal>0?Math.round(tTotal/mTotal*100):0;
                        if(!tLogs.length)return null;
                        return(
                          <div key={k} style={{display:"flex",alignItems:"center",gap:10}}>
                            <span style={{fontSize:15,minWidth:22}}>{t.icon}</span>
                            <div style={{color:t.color,fontSize:12,minWidth:112}}>{t.label}</div>
                            <div style={{color:C.textMuted,fontSize:11,minWidth:30}}>{tLogs.length}件</div>
                            <div style={{flex:1}}><div style={{background:C.border,borderRadius:3,height:6,overflow:"hidden"}}><div style={{background:t.color,height:"100%",width:`${Math.round(tTotal/maxTypeTotal*100)}%`,borderRadius:3,transition:"width .3s"}}/></div></div>
                            <div style={{color:C.warn,fontSize:12,fontWeight:"bold",minWidth:90,textAlign:"right"}}>{fmtYen(tTotal)}</div>
                            {pct>0&&<div style={{color:C.textMuted,fontSize:10,minWidth:34,textAlign:"right"}}>{pct}%</div>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {classes.length>0&&(
                    <div style={{background:"#0f1f3a",border:`1px solid ${C.border}`,borderRadius:8,padding:"16px 20px",marginBottom:14}}>
                      <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── クラス別支出内訳</div>
                      <div style={{display:"grid",gap:9}}>
                        {classes.map(cls=>{
                          const cLogs=filteredByMonth.filter(l=>{const car=cars.find(v=>v.id===l.carId);return car?.classId===cls.id;});
                          const cTotal=cLogs.reduce((s,l)=>s+(l.amount||0),0);
                          const pct=mTotal>0?Math.round(cTotal/mTotal*100):0;
                          if(!cLogs.length)return null;
                          return(
                            <div key={cls.id} style={{display:"flex",alignItems:"center",gap:10}}>
                              <div style={{color:cls.color,fontSize:12,minWidth:134}}>◆ {cls.name}</div>
                              <div style={{color:C.textMuted,fontSize:11,minWidth:30}}>{cLogs.length}件</div>
                              <div style={{flex:1}}><div style={{background:C.border,borderRadius:3,height:6,overflow:"hidden"}}><div style={{background:cls.color,height:"100%",width:`${Math.round(cTotal/maxClsTotalM*100)}%`,borderRadius:3,transition:"width .3s"}}/></div></div>
                              <div style={{color:C.warn,fontSize:12,fontWeight:"bold",minWidth:90,textAlign:"right"}}>{fmtYen(cTotal)}</div>
                              {pct>0&&<div style={{color:C.textMuted,fontSize:10,minWidth:34,textAlign:"right"}}>{pct}%</div>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>)}
                {filteredByMonth.length===0?<div style={{color:C.textMuted,textAlign:"center",padding:40}}>この月の整備ログがありません</div>:(
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {filteredByMonth.map(log=>{
                      const car=cars.find(c=>c.id===log.carId);const t=LOG_TYPES[log.type];const isEd=editLogId===log.id;
                      return(
                        <div key={log.id} style={{background:C.bgCard,border:`1px solid ${isEd?C.yellow:C.border}`,borderLeft:`3px solid ${isEd?C.yellow:t?.color}`,borderRadius:4,overflow:"hidden"}}>
                          {isEd?(
                            <div style={{padding:"14px 20px",background:"#0f1f3a"}}>
                              <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── ログを編集：{car?.name}</div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                                <FR label="種別"><select value={editLogForm.type} onChange={e=>setEditLogForm({...editLogForm,type:e.target.value})} style={inp}>{Object.entries(LOG_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}</select></FR>
                                <FR label="実施日"><DateSelect value={editLogForm.date} onChange={v=>setEditLogForm({...editLogForm,date:v})}/></FR>
                              </div>
                              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                                <FR label="金額（円）"><input type="number" value={editLogForm.amount} onChange={e=>setEditLogForm({...editLogForm,amount:e.target.value})} style={inp} placeholder="例：15000"/></FR>
                                <FR label="支払い先"><input type="text" value={editLogForm.payee} onChange={e=>setEditLogForm({...editLogForm,payee:e.target.value})} style={inp} placeholder="例：○○整備"/></FR>
                              </div>
                              <FR label="メモ"><input type="text" value={editLogForm.note} onChange={e=>setEditLogForm({...editLogForm,note:e.target.value})} style={inp} placeholder="メモ"/></FR>
                              <div style={{display:"flex",gap:8,marginTop:4}}><button onClick={updateLog} style={btn}>保存</button><button onClick={()=>setEditLogId(null)} style={btn2}>キャンセル</button></div>
                            </div>
                          ):(
                            <div style={{padding:"14px 20px",display:"flex",alignItems:"flex-start",gap:12}}>
                              <span style={{fontSize:20}}>{t?.icon}</span>
                              <div style={{flex:1}}>
                                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><div style={{display:"flex",alignItems:"center",gap:10}}><span style={{color:t?.color,fontSize:13,fontWeight:"bold"}}>{t?.label}</span><span style={{color:C.yellow,fontSize:12}}>{car?.name||"不明"}</span></div><span style={{color:C.textMuted,fontSize:11}}>{log.date}</span></div>
                                {log.payee&&<div style={{color:C.textSec,fontSize:11}}>📍 {log.payee}</div>}
                                {log.note&&<div style={{color:C.textSec,fontSize:11}}>{log.note}</div>}
                                {log.amount>0&&<div style={{color:C.warn,fontSize:13,fontWeight:"bold",marginTop:6}}>{fmtYen(log.amount)}</div>}
                              </div>
                              <div style={{display:"flex",gap:4}}>
                                <button onClick={()=>openEditLog(log)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:13,padding:"2px 6px"}}>✏️</button>
                                <button onClick={()=>delLog(log.id)} style={{background:"none",border:"none",color:C.textMuted,cursor:"pointer",fontSize:16,padding:"2px 6px"}}>✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })()}

            {logViewMode==="year"&&(()=>{
              const years=allCalYears.length>0?allCalYears:[new Date().getFullYear()];
              const allTotal=logs.reduce((s,l)=>s+(l.amount||0),0);
              const maxMonthTotal=Math.max(1,...[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>{const ym=`${logYearFilter}-${String(m).padStart(2,"0")}`;return filteredByYear.filter(l=>getYM(l.date)===ym).reduce((s,l)=>s+(l.amount||0),0);}));
              return(
                <div>
                  {/* 全期間総額 */}
                  <div style={{background:C.bgForm,border:`2px solid ${C.yellow}33`,borderRadius:8,padding:"18px 24px",marginBottom:20}}>
                    <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── 全期間累計</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:12,marginBottom:years.length>1?16:0}}>
                      <div style={{textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>総支出額</div><div style={{color:C.warn,fontSize:26,fontWeight:"bold"}}>{fmtYen(allTotal)}</div></div>
                      <div style={{textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>総整備件数</div><div style={{color:C.textPri,fontSize:26,fontWeight:"bold"}}>{logs.length}<span style={{fontSize:12,color:C.textMuted}}>件</span></div></div>
                      <div style={{textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>記録年数</div><div style={{color:C.textPri,fontSize:26,fontWeight:"bold"}}>{years.length}<span style={{fontSize:12,color:C.textMuted}}>年</span></div></div>
                    </div>
                    {years.length>1&&(
                      <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                        <div style={{color:C.textMuted,fontSize:10,marginBottom:10}}>年別比較</div>
                        {years.map(y=>{
                          const yTotal=logs.filter(l=>getCalYear(l.date)===y).reduce((s,l)=>s+(l.amount||0),0);
                          const maxY=Math.max(1,...years.map(yy=>logs.filter(l=>getCalYear(l.date)===yy).reduce((s,l)=>s+(l.amount||0),0)));
                          return(
                            <div key={y} style={{display:"flex",alignItems:"center",gap:12,marginBottom:8,cursor:"pointer"}} onClick={()=>setLogYearFilter(y)}>
                              <div style={{color:logYearFilter===y?C.yellow:C.textSec,fontSize:12,minWidth:50,fontWeight:logYearFilter===y?"bold":"normal"}}>{y}年</div>
                              <div style={{flex:1,background:C.border,borderRadius:3,height:8,overflow:"hidden"}}><div style={{background:logYearFilter===y?C.yellow:C.warn,height:"100%",width:`${Math.round(yTotal/maxY*100)}%`,borderRadius:3,transition:"width 0.3s"}}/></div>
                              <div style={{color:yTotal>0?C.warn:C.textMuted,fontSize:12,fontWeight:"bold",minWidth:90,textAlign:"right"}}>{fmtYen(yTotal)}</div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 年選択 */}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
                    <div style={{color:C.textSec,fontSize:11}}>年を選択：</div>
                    {years.map(y=><button key={y} onClick={()=>setLogYearFilter(y)} style={{...btn2,borderColor:logYearFilter===y?C.yellow:C.border,color:logYearFilter===y?C.yellow:C.textMuted,fontWeight:logYearFilter===y?"bold":"normal",padding:"7px 16px"}}>{y}年</button>)}
                  </div>

                  {/* 選択年サマリー */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:20}}>
                    <div style={{background:C.bgCard,border:`1px solid ${C.yellow}44`,borderRadius:6,padding:"14px 16px",textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>{logYearFilter}年 総支出</div><div style={{color:C.warn,fontSize:22,fontWeight:"bold"}}>{fmtYen(filteredByYear.reduce((s,l)=>s+(l.amount||0),0))}</div></div>
                    <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 16px",textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>整備件数</div><div style={{color:C.textPri,fontSize:22,fontWeight:"bold"}}>{filteredByYear.length}<span style={{fontSize:11,color:C.textMuted}}>件</span></div></div>
                    <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 16px",textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>対象車両数</div><div style={{color:C.textPri,fontSize:22,fontWeight:"bold"}}>{new Set(filteredByYear.map(l=>l.carId)).size}<span style={{fontSize:11,color:C.textMuted}}>台</span></div></div>
                  </div>

                  {/* 車両別内訳 */}
                  <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── {logYearFilter}年 車両別支出内訳</div>
                  <div style={{display:"grid",gap:8,marginBottom:24}}>
                    {cars.map(car=>{
                      const cLogs=filteredByYear.filter(l=>l.carId===car.id);if(!cLogs.length)return null;
                      const cTotal=cLogs.reduce((s,l)=>s+(l.amount||0),0);
                      const grandTotal=filteredByYear.reduce((s,l)=>s+(l.amount||0),0);
                      const pct=grandTotal>0?Math.round(cTotal/grandTotal*100):0;
                      const cls=getClass(car.classId);
                      return(
                        <div key={car.id} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:6,padding:"14px 20px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:16,flexWrap:"wrap",marginBottom:cTotal>0?10:0}}>
                            <div style={{flex:1,minWidth:140}}>
                              {cls&&<div style={{marginBottom:4}}><ClassBadge name={cls.name} color={cls.color}/></div>}
                              <div style={{color:C.yellow,fontWeight:"bold",marginBottom:6}}>{car.name}</div>
                              <Plate plate={car.plate} size="sm"/>
                            </div>
                            <div style={{textAlign:"center"}}><div style={{color:C.textMuted,fontSize:10,marginBottom:2}}>件数</div><div style={{color:C.textPri,fontSize:15,fontWeight:"bold"}}>{cLogs.length}件</div></div>
                            <div style={{textAlign:"right",minWidth:120}}>
                              <div style={{color:C.textMuted,fontSize:10,marginBottom:2}}>支出合計</div>
                              <div style={{color:cTotal>0?C.warn:C.textMuted,fontSize:18,fontWeight:"bold"}}>{cTotal>0?fmtYen(cTotal):"—"}</div>
                              {pct>0&&<div style={{color:C.textMuted,fontSize:10,marginTop:2}}>全体の {pct}%</div>}
                            </div>
                          </div>
                          {cTotal>0&&<div style={{background:C.border,borderRadius:3,height:5,overflow:"hidden"}}><div style={{background:C.warn,height:"100%",width:`${pct}%`,borderRadius:3,transition:"width 0.4s"}}/></div>}
                        </div>
                      );
                    })}
                    {filteredByYear.length===0&&<div style={{color:C.textMuted,textAlign:"center",padding:32}}>{logYearFilter}年の整備ログがありません</div>}
                  </div>

                  {/* ② 種別別内訳（年別） */}
                  {filteredByYear.length>0&&(()=>{
                    const yTotal=filteredByYear.reduce((s,l)=>s+(l.amount||0),0);
                    const maxTypeY=Math.max(1,...Object.keys(LOG_TYPES).map(k=>filteredByYear.filter(l=>l.type===k).reduce((s,l)=>s+(l.amount||0),0)));
                    return(
                      <div style={{background:"#0f1f3a",border:`1px solid ${C.border}`,borderRadius:8,padding:"16px 20px",marginBottom:14}}>
                        <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── {logYearFilter}年 種別別支出内訳</div>
                        <div style={{display:"grid",gap:9}}>
                          {Object.entries(LOG_TYPES).map(([k,t])=>{
                            const tLogs=filteredByYear.filter(l=>l.type===k);
                            const tTotal=tLogs.reduce((s,l)=>s+(l.amount||0),0);
                            const pct=yTotal>0?Math.round(tTotal/yTotal*100):0;
                            if(!tLogs.length)return null;
                            return(
                              <div key={k} style={{display:"flex",alignItems:"center",gap:10}}>
                                <span style={{fontSize:15,minWidth:22}}>{t.icon}</span>
                                <div style={{color:t.color,fontSize:12,minWidth:112}}>{t.label}</div>
                                <div style={{color:C.textMuted,fontSize:11,minWidth:30}}>{tLogs.length}件</div>
                                <div style={{flex:1}}><div style={{background:C.border,borderRadius:3,height:6,overflow:"hidden"}}><div style={{background:t.color,height:"100%",width:`${Math.round(tTotal/maxTypeY*100)}%`,borderRadius:3,transition:"width .3s"}}/></div></div>
                                <div style={{color:C.warn,fontSize:12,fontWeight:"bold",minWidth:90,textAlign:"right"}}>{fmtYen(tTotal)}</div>
                                {pct>0&&<div style={{color:C.textMuted,fontSize:10,minWidth:34,textAlign:"right"}}>{pct}%</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* ③ クラス別内訳（年別） */}
                  {filteredByYear.length>0&&classes.length>0&&(()=>{
                    const yTotal=filteredByYear.reduce((s,l)=>s+(l.amount||0),0);
                    const maxClsY=Math.max(1,...classes.map(cls=>filteredByYear.filter(l=>{const car=cars.find(v=>v.id===l.carId);return car?.classId===cls.id;}).reduce((s,l)=>s+(l.amount||0),0)));
                    return(
                      <div style={{background:"#0f1f3a",border:`1px solid ${C.border}`,borderRadius:8,padding:"16px 20px",marginBottom:14}}>
                        <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:14}}>── {logYearFilter}年 クラス別支出内訳</div>
                        <div style={{display:"grid",gap:9}}>
                          {classes.map(cls=>{
                            const cLogs=filteredByYear.filter(l=>{const car=cars.find(v=>v.id===l.carId);return car?.classId===cls.id;});
                            const cTotal=cLogs.reduce((s,l)=>s+(l.amount||0),0);
                            const pct=yTotal>0?Math.round(cTotal/yTotal*100):0;
                            if(!cLogs.length)return null;
                            return(
                              <div key={cls.id} style={{display:"flex",alignItems:"center",gap:10}}>
                                <div style={{color:cls.color,fontSize:12,minWidth:134}}>◆ {cls.name}</div>
                                <div style={{color:C.textMuted,fontSize:11,minWidth:30}}>{cLogs.length}件</div>
                                <div style={{flex:1}}><div style={{background:C.border,borderRadius:3,height:6,overflow:"hidden"}}><div style={{background:cls.color,height:"100%",width:`${Math.round(cTotal/maxClsY*100)}%`,borderRadius:3,transition:"width .3s"}}/></div></div>
                                <div style={{color:C.warn,fontSize:12,fontWeight:"bold",minWidth:90,textAlign:"right"}}>{fmtYen(cTotal)}</div>
                                {pct>0&&<div style={{color:C.textMuted,fontSize:10,minWidth:34,textAlign:"right"}}>{pct}%</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* 月別推移 */}
                  {filteredByYear.length>0&&(
                    <>
                      <div style={{color:C.yellow,fontSize:11,letterSpacing:2,marginBottom:12}}>── {logYearFilter}年 月別推移</div>
                      {[1,2,3,4,5,6,7,8,9,10,11,12].map(m=>{
                        const ym=`${logYearFilter}-${String(m).padStart(2,"0")}`;
                        const mLogs=filteredByYear.filter(l=>getYM(l.date)===ym);
                        const mTotal=mLogs.reduce((s,l)=>s+(l.amount||0),0);
                        if(!mLogs.length)return null;
                        return(
                          <div key={m} style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:5,padding:"12px 20px",marginBottom:8,display:"flex",alignItems:"center",gap:16}}>
                            <div style={{color:C.textSec,fontSize:12,minWidth:50}}>{m}月</div>
                            <div style={{color:C.textMuted,fontSize:11,minWidth:32}}>{mLogs.length}件</div>
                            <div style={{flex:1}}><div style={{background:C.border,borderRadius:3,height:6,overflow:"hidden"}}><div style={{background:C.warn,height:"100%",width:`${Math.round(mTotal/maxMonthTotal*100)}%`,borderRadius:3,transition:"width 0.3s"}}/></div></div>
                            <div style={{color:C.warn,fontSize:13,fontWeight:"bold",minWidth:100,textAlign:"right"}}>{fmtYen(mTotal)}</div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ══ 車検管理 ══ */}
        {tab==="inspection"&&(
          <div>
            <h2 style={{color:C.yellow,fontSize:13,letterSpacing:3,marginBottom:6,fontWeight:"normal"}}>── 車検管理</h2>
            <p style={{color:C.textMuted,fontSize:12,marginBottom:20}}>車両を選択して車検日を入力してください</p>
            {cars.length===0?<div style={{color:C.textMuted,textAlign:"center",padding:40}}>まず「車両管理」タブで車両を登録してください</div>:(
              <div style={{display:"grid",gap:12}}>
                {cars.map(car=>{
                  const d=carData[car.id]||{};
                  const days=d.inspectionDate?daysUntil(d.inspectionDate):null;
                  const st=days===null?"未設定":days<=0?"期限切れ":days<=30?"要注意":days<=60?"注意":"正常";
                  const sc={未設定:C.textMuted,期限切れ:C.danger,要注意:C.danger,注意:C.warn,正常:C.success}[st];
                  const isOpen=inspCarId===car.id;
                  const cls=getClass(car.classId);
                  return(
                    <div key={car.id} style={{background:C.bgCard,border:`1px solid ${isOpen?C.yellow:days!==null&&days<=60?sc:C.border}`,borderRadius:6,overflow:"hidden",boxShadow:isOpen?`0 0 14px ${C.yellow}22`:"none"}}>
                      <div onClick={()=>setInspCarId(isOpen?null:car.id)} style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px",cursor:"pointer",flexWrap:"wrap"}}>
                        <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${isOpen?C.yellow:C.border}`,background:isOpen?C.yellow:"none",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{isOpen&&<div style={{width:7,height:7,borderRadius:"50%",background:"#000"}}/>}</div>
                        <div style={{flex:1,minWidth:160}}>
                          {cls&&<div style={{marginBottom:6}}><ClassBadge name={cls.name} color={cls.color}/></div>}
                          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}><div style={{color:C.yellow,fontWeight:"bold",fontSize:15}}>{car.name}</div><StatusBadge status={car.status||"active"}/></div>
                          <Plate plate={car.plate} size="md"/>
                        </div>
                        <div style={{textAlign:"right",minWidth:110}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>前回車検日</div><div style={{color:C.textSec,fontSize:13}}>{d.prevInspectionDate?formatDate(d.prevInspectionDate):<span style={{color:C.textMuted}}>未設定</span>}</div></div>
                        <div style={{textAlign:"right",minWidth:110}}><div style={{color:C.textMuted,fontSize:10,marginBottom:4}}>次回車検日</div><div style={{color:C.textPri,fontSize:13,fontWeight:"bold"}}>{d.inspectionDate?formatDate(d.inspectionDate):<span style={{color:C.textMuted}}>未設定</span>}</div></div>
                        <div style={{textAlign:"center",minWidth:80}}><div style={{color:sc,fontWeight:"bold",fontSize:13}}>{st}</div>{days!==null&&<div style={{color:sc,fontSize:11,marginTop:2}}>{days>0?`あと${days}日`:`${Math.abs(days)}日超過`}</div>}</div>
                      </div>
                      {isOpen&&<InspForm carId={car.id} initPrev={d.prevInspectionDate||""} initNext={d.inspectionDate||""} onSave={saveInsp} onClose={()=>setInspCarId(null)}/>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
