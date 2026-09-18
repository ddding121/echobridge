"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, AudioLines, BookOpenText, CheckCircle2, ChevronRight, CircleHelp, Contrast, Download, FileAudio, Focus, Globe2, Headphones, ListChecks, LoaderCircle, MessageCircleMore, Mic2, Pause, Play, Plus, Radio, RotateCcw, Sparkles, Square, Trash2, Type, Upload, Volume2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const bars = [28,42,64,38,74,55,88,52,36,68,45,82,58,94,46,66,38,76,54,34,70,44,86,62,40,72,50,80,36,64,48,90,56,42,76,52,68,34,60,46];
const MAX_UPLOAD_BYTES = 120 * 1024 * 1024;
const MAX_CLASS_SECONDS = 90 * 60;
const CHUNK_SECONDS = 30;
const OUTPUT_SAMPLE_RATE = 16000;
const RECENT_CLASSES_KEY = "echobridge-recent-classes-v1";
const transcript = [
  { time:"08:42", speaker:"闄堣€佸笀", text:"鐩戠潱瀛︿範鐨勭洰鏍囷紝鏄粠宸茬粡鏍囨敞鐨勬暟鎹腑瀛︿範杈撳叆涓庤緭鍑轰箣闂寸殑鏄犲皠鍏崇郴銆?, translation:"The goal of supervised learning is to learn a mapping between inputs and outputs from labeled data.", active:true },
  { time:"09:06", speaker:"闄堣€佸笀", text:"鎴戜滑浠婂ぉ閲嶇偣姣旇緝鍒嗙被鍜屽洖褰掋€傚垎绫婚娴嬬鏁ｇ被鍒紝鑰屽洖褰掗娴嬭繛缁暟鍊笺€?, translation:"Today we compare classification and regression: discrete categories versus continuous values." },
  { time:"09:31", speaker:"鍚屽鎻愰棶", text:"濡傛灉鏍囩鏈韩瀛樺湪閿欒锛屼細瀵规ā鍨嬩骇鐢熶粈涔堝奖鍝嶏紵", translation:"What happens when some of the labels are incorrect?" },
];

type StudyGuide = {
  title: string;
  summary: string;
  keyPoints: string[];
  tasks: string[];
  reviewQuestions: string[];
};

type QAItem = {
  question: string;
  answer: string;
  citations: Array<{quote:string;reason:string}>;
};

const sampleGuide: StudyGuide = {
  title: "鐩戠潱瀛︿範锛氬垎绫汇€佸洖褰掍笌杩囨嫙鍚?,
  summary: "鏈妭璇句粙缁嶇洃鐫ｅ涔犱腑鍒嗙被涓庡洖褰掔殑鍖哄埆锛屼互鍙婅缁冮泦銆佹祴璇曢泦鍜岃繃鎷熷悎鐨勫惈涔夛紝骞惰鏄庝簡澧炲姞鏁版嵁銆侀檷浣庢ā鍨嬪鏉傚害鍜屾鍒欏寲绛夋敼杩涙柟娉曘€?,
  keyPoints: ["鐩戠潱瀛︿範浣跨敤甯︽爣绛剧殑鏁版嵁瀛︿範杈撳叆涓庤緭鍑轰箣闂寸殑鍏崇郴銆?,"鍒嗙被棰勬祴绂绘暎绫诲埆锛屽洖褰掗娴嬭繛缁暟鍊笺€?,"璁粌闆嗙敤浜庡涔犲弬鏁帮紝娴嬭瘯闆嗙敤浜庤瘎浼版ā鍨嬪鏂版暟鎹殑琛ㄧ幇銆?,"璁粌琛ㄧ幇濂戒絾娴嬭瘯琛ㄧ幇鏄庢樉鍙樺樊锛岄€氬父鎰忓懗鐫€杩囨嫙鍚堛€?,"閿欒鏍囩鍙兘璁╂ā鍨嬪鍒伴敊璇寰嬨€?],
  tasks: ["瀹屾垚鏁欐潗绗笁绔犵涓€鍒扮鍥涢銆?,"鍒嗗埆涓惧嚭涓€涓垎绫婚棶棰樺拰涓€涓洖褰掗棶棰樸€?],
  reviewQuestions: ["鍒嗙被鍜屽洖褰掔殑鏍稿績鍖哄埆鏄粈涔堬紵","浠€涔堟槸杩囨嫙鍚堬紵","鑰佸笀甯冪疆浜嗕粈涔堣鍚庝换鍔★紵"],
};

const demoTranscript = "鍚屽浠ソ锛屼粖澶╂垜浠涔犵洃鐫ｅ涔犱腑鐨勫垎绫讳笌鍥炲綊銆傜洃鐫ｅ涔犱娇鐢ㄥ甫鏈夋爣绛剧殑鏁版嵁锛岃妯″瀷瀛︿範杈撳叆鍜岃緭鍑轰箣闂寸殑鍏崇郴銆傚垎绫讳换鍔￠娴嬬鏁ｇ被鍒紝渚嬪鍒ゆ柇涓€灏侀偖浠舵槸姝ｅ父閭欢杩樻槸鍨冨溇閭欢锛涘洖褰掍换鍔￠娴嬭繛缁暟鍊硷紝渚嬪鏍规嵁闈㈢Н銆佷綅缃拰鎴块緞棰勬祴鎴夸环銆傝缁冩ā鍨嬫椂锛屾垜浠€氬父鎶婃暟鎹垎鎴愯缁冮泦鍜屾祴璇曢泦銆傝缁冮泦鐢ㄤ簬瀛︿範鍙傛暟锛屾祴璇曢泦鐢ㄤ簬璇勪及妯″瀷闈㈠鏂版暟鎹椂鐨勮〃鐜般€傚鏋滄ā鍨嬪湪璁粌闆嗕笂寰堝ソ锛屼絾鍦ㄦ祴璇曢泦涓婃槑鏄惧彉宸紝杩欑鐜拌薄鍙綔杩囨嫙鍚堛€傚噺灏戣繃鎷熷悎鐨勬柟娉曞寘鎷鍔犺缁冩暟鎹€侀檷浣庢ā鍨嬪鏉傚害鍜屼娇鐢ㄦ鍒欏寲銆傝繕瑕佹敞鎰忔爣绛捐川閲忥紝閿欒鏍囩浼氳妯″瀷瀛﹀埌閿欒瑙勫緥銆備粖澶╃殑璇惧悗浠诲姟鏄細瀹屾垚鏁欐潗绗笁绔犵涓€鍒扮鍥涢锛屽苟鍒嗗埆涓惧嚭涓€涓垎绫婚棶棰樺拰涓€涓洖褰掗棶棰樸€備笅鑺傝鎴戜滑浼氬涔犲噯纭巼銆佺簿纭巼鍜屽彫鍥炵巼銆?;

type RecentSession = {
  id: string;
  title: string;
  meta: string;
  fileName: string;
  transcript: string;
  guide: StudyGuide|null;
  isDemo: boolean;
  file?: File;
};

const demoSession:RecentSession={id:"demo-class",title:sampleGuide.title,meta:"鍐呯疆绀轰緥 路 绾?鍒嗛挓",fileName:"EchoBridge 绀轰緥璇惧爞",transcript:demoTranscript,guide:sampleGuide,isDemo:true};

export default function Home() {
  const fileInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const decodedAudioRef = useRef<AudioBuffer|null>(null);
  const decodedFileRef = useRef<File|null>(null);
  const [playing,setPlaying] = useState(false);
  const [audioUrl,setAudioUrl] = useState("");
  const [currentTime,setCurrentTime] = useState(0);
  const [duration,setDuration] = useState(0);
  const [waveform,setWaveform] = useState(bars);
  const [fileName,setFileName] = useState("");
  const [selectedFile,setSelectedFile] = useState<File|null>(null);
  const [dashscopeKey,setDashscopeKey] = useState("");
  const [transcribing,setTranscribing] = useState(false);
  const [processingStatus,setProcessingStatus] = useState("");
  const [fileError,setFileError] = useState("");
  const [uploadedTranscript,setUploadedTranscript] = useState("");
  const [studyGuide,setStudyGuide] = useState<StudyGuide|null>(null);
  const [studyGuideWarning,setStudyGuideWarning] = useState("");
  const [question,setQuestion] = useState("");
  const [asking,setAsking] = useState(false);
  const [askError,setAskError] = useState("");
  const [qaHistory,setQaHistory] = useState<QAItem[]>([]);
  const [language,setLanguage] = useState<"鍙岃"|"涓枃">("鍙岃");
  const [a11yOpen,setA11yOpen] = useState(false);
  const [subtitleSize,setSubtitleSize] = useState<"standard"|"large"|"xlarge">("standard");
  const [highContrast,setHighContrast] = useState(false);
  const [focusMode,setFocusMode] = useState(false);
  const [demoMode,setDemoMode] = useState(false);
  const [activeSessionId,setActiveSessionId] = useState<string|null>(null);
  const [recentSessions,setRecentSessions] = useState<RecentSession[]>([demoSession]);
  const speech = useSpeechRecognition();

  useEffect(()=>()=>{if(audioUrl) URL.revokeObjectURL(audioUrl)},[audioUrl]);
  useEffect(()=>{
    try {
      const saved=JSON.parse(localStorage.getItem(RECENT_CLASSES_KEY)||"[]") as RecentSession[];
      const valid=saved.filter(item=>item&&typeof item.id==="string"&&typeof item.transcript==="string"&&!item.isDemo).slice(0,8);
      setRecentSessions([...valid,demoSession]);
    } catch {
      localStorage.removeItem(RECENT_CLASSES_KEY);
    }
  },[]);

  function persistRecentSessions(items:RecentSession[]) {
    const stored=items.filter(item=>!item.isDemo).slice(0,8).map(({file:_,...item})=>item);
    try { localStorage.setItem(RECENT_CLASSES_KEY,JSON.stringify(stored)); } catch { /* 娴忚鍣ㄧ┖闂翠笉瓒虫椂浠嶄繚鐣欏綋鍓嶉〉闈㈠唴瀹?*/ }
  }

  async function decodeAudio(file:File) {
    if(decodedFileRef.current===file&&decodedAudioRef.current) return decodedAudioRef.current;
    const context = new AudioContext();
    try {
      const buffer = await context.decodeAudioData(await file.arrayBuffer());
      decodedFileRef.current=file;
      decodedAudioRef.current=buffer;
      return buffer;
    } finally {
      await context.close();
    }
  }

  async function buildWaveform(file:File) {
    try {
      const buffer = await decodeAudio(file);
      const channel = buffer.getChannelData(0);
      const block = Math.max(1,Math.floor(channel.length/bars.length));
      const values = bars.map((_,index)=>{
        let peak = 0;
        const start = index*block;
        for(let i=start;i<Math.min(start+block,channel.length);i++) peak=Math.max(peak,Math.abs(channel[i]));
        return Math.max(18,Math.round(peak*100));
      });
      setWaveform(values);
    } catch {
      setWaveform(bars);
    }
  }

  function encodeWavChunk(buffer:AudioBuffer,startSeconds:number,endSeconds:number) {
    const frameCount=Math.ceil((endSeconds-startSeconds)*OUTPUT_SAMPLE_RATE);
    const wav=new ArrayBuffer(44+frameCount*2);
    const view=new DataView(wav);
    const write=(offset:number,value:string)=>{for(let i=0;i<value.length;i++) view.setUint8(offset+i,value.charCodeAt(i));};
    write(0,"RIFF"); view.setUint32(4,36+frameCount*2,true); write(8,"WAVE"); write(12,"fmt ");
    view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true);
    view.setUint32(24,OUTPUT_SAMPLE_RATE,true); view.setUint32(28,OUTPUT_SAMPLE_RATE*2,true);
    view.setUint16(32,2,true); view.setUint16(34,16,true); write(36,"data"); view.setUint32(40,frameCount*2,true);
    const sourceStart=Math.floor(startSeconds*buffer.sampleRate);
    const ratio=buffer.sampleRate/OUTPUT_SAMPLE_RATE;
    const channels=Array.from({length:buffer.numberOfChannels},(_,index)=>buffer.getChannelData(index));
    for(let i=0;i<frameCount;i++) {
      const sourceIndex=Math.min(buffer.length-1,sourceStart+Math.floor(i*ratio));
      let sample=0;
      for(const channel of channels) sample+=channel[sourceIndex]||0;
      sample=Math.max(-1,Math.min(1,sample/channels.length));
      view.setInt16(44+i*2,sample<0?sample*0x8000:sample*0x7fff,true);
    }
    return new Blob([wav],{type:"audio/wav"});
  }

  function setAudioFile(file?:File) {
    audioRef.current?.pause();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioUrl(file?URL.createObjectURL(file):"");
    if(file) void buildWaveform(file); else setWaveform(bars);
  }

  function formatTime(seconds:number) {
    if(!Number.isFinite(seconds)||seconds<0) return "00:00";
    const minutes=Math.floor(seconds/60);
    return `${String(minutes).padStart(2,"0")}:${String(Math.floor(seconds%60)).padStart(2,"0")}`;
  }

  async function togglePlayback() {
    const audio=audioRef.current;
    if(!audio||!audioUrl) return;
    if(audio.paused) await audio.play(); else audio.pause();
  }

  function seekAudio(value:number[]) {
    const next=value[0]||0;
    if(audioRef.current) audioRef.current.currentTime=next;
    setCurrentTime(next);
  }

  function selectAudio(file?: File) {
    if (!file) return;
    decodedAudioRef.current=null;
    decodedFileRef.current=null;
    setSelectedFile(file);
    setDemoMode(false);
    setActiveSessionId(null);
    setAudioFile(file);
    setFileName(file.name);
    setFileError("");
    setUploadedTranscript("");
    setStudyGuide(null);
    setStudyGuideWarning("");
    setQuestion("");
    setAskError("");
    setQaHistory([]);
  }

  async function transcribeFile() {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setFileError("鏂囦欢瓒呰繃 120MB銆傚缓璁厛瀵煎嚭涓?MP3 鎴?M4A锛屽啀閲嶆柊涓婁紶銆?);
      return;
    }
    setTranscribing(true);
    setFileError("");
    setUploadedTranscript("");
    setStudyGuide(null);
    setStudyGuideWarning("");
    try {
      const headers: HeadersInit = {};
      if (dashscopeKey.trim()) headers["x-dashscope-api-key"] = dashscopeKey.trim();
      setProcessingStatus("姝ｅ湪璇诲彇璇惧爞闊抽鈥?);
      const decoded=await decodeAudio(selectedFile);
      if(decoded.duration>MAX_CLASS_SECONDS) throw new Error("褰撳墠鏀寔鏈€闀?90 鍒嗛挓鐨勮鍫傚綍闊炽€?);
      const chunkCount=Math.ceil(decoded.duration/CHUNK_SECONDS);
      const texts:string[]=[];
      for(let index=0;index<chunkCount;index++) {
        setProcessingStatus(`姝ｅ湪杞啓绗?${index+1}/${chunkCount} 娈碘€);
        const start=index*CHUNK_SECONDS;
        const blob=encodeWavChunk(decoded,start,Math.min(decoded.duration,start+CHUNK_SECONDS));
        const body=new FormData();
        body.append("file",blob,`${selectedFile.name}-part-${index+1}.wav`);
        body.append("createNotes","false");
        const response=await fetch("/api/transcribe",{method:"POST",headers,body});
        const result=await response.json() as {text?:string;error?:string};
        if(!response.ok||!result.text) throw new Error(result.error||`绗?${index+1} 娈佃浆鍐欏け璐ワ紝璇烽噸璇曘€俙);
        texts.push(result.text);
      }
      const fullTranscript=texts.join("\n\n");
      setUploadedTranscript(fullTranscript);
      setProcessingStatus("姝ｅ湪鏁寸悊 AI 瀛︿範绗旇鈥?);
      const guideResponse=await fetch("/api/study-guide",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({transcript:fullTranscript})});
      const guideResult=await guideResponse.json() as {studyGuide?:StudyGuide;error?:string};
      const finalGuide=guideResponse.ok?guideResult.studyGuide||null:null;
      setStudyGuide(finalGuide);
      setStudyGuideWarning(finalGuide?"":guideResult.error||"閫愬瓧绋垮凡鐢熸垚锛屼絾AI绗旇鏆傛椂鏁寸悊澶辫触銆?);
      const sessionId=`class-${Date.now()}`;
      const saved:RecentSession={id:sessionId,title:finalGuide?.title||selectedFile.name,meta:`鍒氬垰 路 ${formatTime(decoded.duration)} 路 宸插畬鎴恅,fileName:selectedFile.name,transcript:fullTranscript,guide:finalGuide,isDemo:false,file:selectedFile};
      setRecentSessions(items=>{
        const next=[saved,...items.filter(item=>item.id!==sessionId)];
        persistRecentSessions(next);
        return [...next.filter(item=>!item.isDemo).slice(0,8),next.find(item=>item.isDemo)||demoSession];
      });
      setActiveSessionId(sessionId);
    } catch (error) {
      setFileError(error instanceof Error?error.message:"杞啓澶辫触锛岃绋嶅悗閲嶈瘯銆?);
    } finally {
      setTranscribing(false);
      setProcessingStatus("");
    }
  }

  async function askAboutClass() {
    const cleanQuestion = question.trim();
    if (!uploadedTranscript) {
      setAskError("璇峰厛涓婁紶骞跺畬鎴愪竴娈佃鍫傚綍闊崇殑杞啓銆?);
      return;
    }
    if (!cleanQuestion) {
      setAskError("鍏堝啓涓嬩綘鎯抽棶鐨勯棶棰樸€?);
      return;
    }
    if (demoMode) {
      const answer = cleanQuestion.includes("浣滀笟")||cleanQuestion.includes("浠诲姟")
        ? {answer:"鑰佸笀甯冪疆浜嗕袱椤逛换鍔★細瀹屾垚鏁欐潗绗笁绔犵涓€鍒扮鍥涢锛屽苟鍚勪妇鍑轰竴涓垎绫婚棶棰樺拰鍥炲綊闂銆?,citations:[{quote:"浠婂ぉ鐨勮鍚庝换鍔℃槸锛氬畬鎴愭暀鏉愮涓夌珷绗竴鍒扮鍥涢锛屽苟鍒嗗埆涓惧嚭涓€涓垎绫婚棶棰樺拰涓€涓洖褰掗棶棰樸€?,reason:"鍘熸枃鐩存帴璇存槑浜嗕袱椤硅鍚庝换鍔°€?}]}
        : cleanQuestion.includes("杩囨嫙鍚?)
          ? {answer:"杩囨嫙鍚堟槸妯″瀷鍦ㄨ缁冮泦涓婅〃鐜板緢濂斤紝浣嗛潰瀵规祴璇曢泦鐨勬柊鏁版嵁鏃惰〃鐜版槑鏄惧彉宸€傝鍫傝繕缁欏嚭浜嗗鍔犳暟鎹€侀檷浣庡鏉傚害鍜屼娇鐢ㄦ鍒欏寲涓夌鏀硅繘鏂规硶銆?,citations:[{quote:"濡傛灉妯″瀷鍦ㄨ缁冮泦涓婂緢濂斤紝浣嗗湪娴嬭瘯闆嗕笂鏄庢樉鍙樺樊锛岃繖绉嶇幇璞″彨浣滆繃鎷熷悎銆?,reason:"鍘熸枃缁欏嚭浜嗚繃鎷熷悎鐨勫畾涔夈€?},{quote:"鍑忓皯杩囨嫙鍚堢殑鏂规硶鍖呮嫭澧炲姞璁粌鏁版嵁銆侀檷浣庢ā鍨嬪鏉傚害鍜屼娇鐢ㄦ鍒欏寲銆?,reason:"鍘熸枃鍒楀嚭浜嗕笁绉嶇紦瑙ｆ柟娉曘€?}]}
          : cleanQuestion.includes("鍒嗙被")||cleanQuestion.includes("鍥炲綊")
            ? {answer:"鍒嗙被浠诲姟棰勬祴绂绘暎绫诲埆锛屼緥濡傚垽鏂偖浠剁被鍨嬶紱鍥炲綊浠诲姟棰勬祴杩炵画鏁板€硷紝渚嬪棰勬祴鎴夸环銆?,citations:[{quote:"鍒嗙被浠诲姟棰勬祴绂绘暎绫诲埆锛屼緥濡傚垽鏂竴灏侀偖浠舵槸姝ｅ父閭欢杩樻槸鍨冨溇閭欢锛涘洖褰掍换鍔￠娴嬭繛缁暟鍊硷紝渚嬪鏍规嵁闈㈢Н銆佷綅缃拰鎴块緞棰勬祴鎴夸环銆?,reason:"鍘熸枃鐩存帴瀵规瘮浜嗕袱绫讳换鍔″苟缁欏嚭渚嬪瓙銆?}]}
            : {answer:"杩欐绀轰緥璇惧爞涓病鏈夎冻澶熶俊鎭洖绛旇闂銆備綘鍙互灏濊瘯璇㈤棶鍒嗙被涓庡洖褰掋€佽繃鎷熷悎鎴栬鍚庝换鍔°€?,citations:[]};
      setQaHistory(items=>[{question:cleanQuestion,...answer},...items]);
      setQuestion("");
      setAskError("");
      return;
    }
    if (!dashscopeKey.trim()) {
      setAskError("璇疯緭鍏?DashScope API Key 鍚庡啀鎻愰棶銆?);
      return;
    }
    setAsking(true);
    setAskError("");
    try {
      const response = await fetch("/api/ask",{
        method:"POST",
        headers:{"Content-Type":"application/json","x-dashscope-api-key":dashscopeKey.trim()},
        body:JSON.stringify({question:cleanQuestion,transcript:uploadedTranscript}),
      });
      const result = await response.json() as {answer?:string;citations?:QAItem["citations"];error?:string};
      if (!response.ok||!result.answer) throw new Error(result.error||"鏆傛椂鏃犳硶鍥炵瓟锛岃绋嶅悗閲嶈瘯銆?);
      setQaHistory(items=>[{question:cleanQuestion,answer:result.answer!,citations:result.citations||[]},...items]);
      setQuestion("");
    } catch (error) {
      setAskError(error instanceof Error?error.message:"鏆傛椂鏃犳硶鍥炵瓟锛岃绋嶅悗閲嶈瘯銆?);
    } finally {
      setAsking(false);
    }
  }

  function loadDemoClass() {
    setDemoMode(true);
    setSelectedFile(null);
    setFileName("EchoBridge 绀轰緥璇惧爞");
    setUploadedTranscript(demoTranscript);
    setStudyGuide(sampleGuide);
    setStudyGuideWarning("");
    setFileError("");
    setQuestion("");
    setAskError("");
    setQaHistory([]);
    setActiveSessionId("demo-class");
    setAudioFile();
  }

  function openRecentSession(session:RecentSession) {
    setActiveSessionId(session.id);
    setDemoMode(session.isDemo);
    setSelectedFile(session.file||null);
    setFileName(session.fileName);
    setUploadedTranscript(session.transcript);
    setStudyGuide(session.guide);
    setStudyGuideWarning("");
    setFileError("");
    setQuestion("");
    setAskError("");
    setQaHistory([]);
    setAudioFile(session.file);
  }

  function removeRecentSession(id:string) {
    setRecentSessions(items=>{
      const next=items.filter(item=>item.id!==id);
      persistRecentSessions(next);
      return next;
    });
    if(activeSessionId===id) {
      setActiveSessionId(null);
      setDemoMode(false);
      setSelectedFile(null);
      setFileName("");
      setUploadedTranscript("");
      setStudyGuide(null);
      setQaHistory([]);
      setAudioFile();
    }
  }

  function exportStudyReport() {
    if (!uploadedTranscript) return;
    const reportWindow = window.open("","_blank");
    if (!reportWindow) {
      setFileError("娴忚鍣ㄩ樆姝簡鎶ュ憡绐楀彛锛岃鍏佽寮瑰嚭绐楀彛鍚庡啀璇曘€?);
      return;
    }
    reportWindow.opener = null;
    const escapeHtml = (value:string) => value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]!));
    const list = (items:string[],empty:string) => items.length
      ? `<ol>${items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ol>`
      : `<p class="muted">${escapeHtml(empty)}</p>`;
    const questions = qaHistory.length
      ? qaHistory.map(item=>`<article class="qa"><h3>闂锛?{escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>${item.citations.map(citation=>`<blockquote>鈥?{escapeHtml(citation.quote)}鈥?small>${escapeHtml(citation.reason)}</small></blockquote>`).join("")}</article>`).join("")
      : `<p class="muted">鏈璇惧爞杩樻病鏈夋彁闂褰曘€?/p>`;
    reportWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(activeGuide.title)}锝淓choBridge瀛︿範鎶ュ憡</title><style>
      @page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#17233d;font:15px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}header{padding-bottom:24px;border-bottom:3px solid #155eef}.brand{color:#155eef;font-weight:800;letter-spacing:.04em}.meta,.muted{color:#68768c}h1{margin:8px 0 4px;font-size:28px}h2{margin:28px 0 10px;font-size:18px;color:#163f8f}h3{margin:0 0 8px;font-size:15px}section{break-inside:avoid}ol{margin:8px 0;padding-left:24px}li{margin:7px 0}.summary{padding:16px 18px;border-left:4px solid #155eef;background:#f3f7ff;border-radius:0 10px 10px 0}.transcript{white-space:pre-wrap;padding:16px;background:#f6f8fb;border:1px solid #dfe6ef;border-radius:10px}.qa{margin:12px 0;padding:14px 16px;border:1px solid #dfe6ef;border-radius:10px}blockquote{margin:10px 0 0;padding:9px 12px;border-left:3px solid #5acdb7;background:#f4fbf9;color:#40516c}small{display:block;margin-top:4px;color:#758198}footer{margin-top:32px;padding-top:12px;border-top:1px solid #dfe6ef;color:#7a8799;font-size:12px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><header><div class="brand">ECHOBRIDGE 路 AI CLASS NOTE</div><h1>${escapeHtml(activeGuide.title)}</h1><div class="meta">鏂囦欢锛?{escapeHtml(fileName)} 路 瀵煎嚭鏃堕棿锛?{escapeHtml(new Date().toLocaleString("zh-CN"))}</div></header>
    <main><section><h2>璇惧爞鎽樿</h2><p class="summary">${escapeHtml(activeGuide.summary)}</p></section><section><h2>鏍稿績鐭ヨ瘑鐐?/h2>${list(activeGuide.keyPoints,"鏈彁鍙栧埌鐭ヨ瘑鐐广€?)}</section><section><h2>璇惧悗浠诲姟</h2>${list(activeGuide.tasks,"閫愬瓧绋夸腑娌℃湁鏄庣‘甯冪疆璇惧悗浠诲姟銆?)}</section><section><h2>璇惧爞闂瓟</h2>${questions}</section><section><h2>瀹屾暣閫愬瓧绋?/h2><div class="transcript">${escapeHtml(uploadedTranscript)}</div></section></main><footer>鐢?EchoBridge 鏍规嵁璇惧爞褰曢煶鐢熸垚銆侫I鍐呭鍙兘瀛樺湪璇樊锛岃缁撳悎璇惧爞鍘熸枃鏍稿銆?/footer></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(()=>reportWindow.print(),350);
  }

  const activeGuide = studyGuide||sampleGuide;
  const subtitleTextClass = subtitleSize==="xlarge"?"text-[1.3rem] leading-9":subtitleSize==="large"?"text-[1.15rem] leading-8":"text-[1rem] leading-7";

  return <main className={`min-h-screen bg-[#f4f7fb] text-[#14213d] ${highContrast?"echo-high-contrast":""}`}>
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dbe4f0] bg-white/90 px-4 backdrop-blur-xl sm:px-7">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#155eef] text-white shadow-[0_7px_18px_rgba(21,94,239,.24)]"><AudioLines className="size-5"/></span><div><p className="text-[1.05rem] font-bold tracking-[-0.02em]">EchoBridge</p><p className="text-xs text-[#61708a]">璁╂瘡涓€鍙ヨ鍫傚唴瀹归兘鑳借鐞嗚В</p></div></div>
      <div className="flex items-center gap-2"><Button variant={a11yOpen?"secondary":"ghost"} size="sm" aria-expanded={a11yOpen} onClick={()=>setA11yOpen(value=>!value)}><Accessibility/><span className="hidden sm:inline">鏃犻殰纰?/span></Button><Button variant="ghost" size="icon" aria-label="甯姪"><CircleHelp/></Button><div className="grid size-9 place-items-center rounded-full bg-[#e8efff] text-sm font-bold text-[#155eef]">DR</div></div>
    </header>

    <div className={`mx-auto grid max-w-[1540px] grid-cols-1 ${focusMode?"":"lg:grid-cols-[236px_minmax(0,1fr)]"}`}>
      <aside className={`${focusMode?"hidden":"hidden lg:block"} min-h-[calc(100vh-64px)] border-r border-[#dbe4f0] bg-white px-4 py-5`}>
        <input ref={fileInput} className="hidden" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" onChange={e=>selectAudio(e.target.files?.[0])}/>
        <Button className="h-11 w-full rounded-xl bg-[#155eef] shadow-[0_8px_18px_rgba(21,94,239,.2)]" onClick={()=>fileInput.current?.click()}><Plus/> 鏂板缓璇惧爞</Button>
        <nav className="mt-7" aria-label="璇惧爞璁板綍"><div className="mb-3 flex items-center justify-between px-2"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#78859b]">鏈€杩戣鍫?/span><span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#155eef]">{recentSessions.length}</span></div><div className="space-y-1.5">{recentSessions.map(session=><div key={session.id} className={`group flex items-center rounded-xl transition ${activeSessionId===session.id?"bg-[#edf3ff] text-[#124bc0]":"text-[#4f5e76] hover:bg-[#f4f7fb]"}`}><button aria-current={activeSessionId===session.id?"page":undefined} onClick={()=>openRecentSession(session)} className="min-w-0 flex-1 px-3 py-3 text-left"><span className="block truncate text-sm font-semibold">{session.title}</span><span className="mt-1 block text-xs opacity-70">{session.meta}</span></button>{!session.isDemo&&<button aria-label={`鍒犻櫎璇惧爞锛?{session.title}`} title="鍒犻櫎璁板綍" onClick={()=>removeRecentSession(session.id)} className="mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-[#8794a8] opacity-70 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"><Trash2 className="size-4"/></button>}</div>)}</div><p className="mt-3 px-2 text-xs leading-5 text-[#8a96a8]">閫愬瓧绋夸笌绗旇淇濆瓨鍦ㄦ湰鏈烘祻瑙堝櫒锛涘埛鏂板悗浠嶅彲鏌ョ湅銆備负淇濇姢闅愮锛屽師濮嬮煶棰戜笉浼氫繚瀛樸€?/p></nav>
        <div className="mt-8 rounded-2xl border border-[#dce6f5] bg-[#f7faff] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#29405f]"><Headphones className="size-4 text-[#155eef]"/> 鏃犻殰纰嶆ā寮?/div><p className="mt-2 text-xs leading-5 text-[#6a7890]">璋冩暣瀛楀箷瀛楀彿銆佺敾闈㈠姣斿害鍜岄槄璇诲竷灞€銆?/p><Button variant="outline" size="sm" className="mt-3 w-full bg-white" onClick={()=>setA11yOpen(true)}>鎵撳紑璁剧疆</Button></div>
      </aside>

      <section className={`min-w-0 px-4 py-5 sm:px-7 sm:py-7 ${focusMode?"mx-auto w-full max-w-5xl":""}`}>
        {a11yOpen&&<section className="mb-5 rounded-2xl border border-[#b9cef8] bg-white p-4 shadow-[0_12px_28px_rgba(32,57,96,.07)] sm:p-5" aria-label="鏃犻殰纰嶈缃?><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-bold text-[#18345f]"><Accessibility className="size-5 text-[#155eef]"/> 鏃犻殰纰嶅涔犺缃?/div><p className="mt-1 text-sm leading-6 text-[#697890]">璁剧疆绔嬪嵆鐢熸晥锛屽彧褰卞搷褰撳墠椤甸潰銆?/p></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={()=>{setSubtitleSize("standard");setHighContrast(false);setFocusMode(false)}}><RotateCcw/> 鎭㈠榛樿</Button><Button variant="ghost" size="icon" aria-label="鍏抽棴鏃犻殰纰嶈缃? onClick={()=>setA11yOpen(false)}><X/></Button></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#f5f8fc] p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Type className="size-4 text-[#155eef]"/> 瀛楀箷瀛楀彿</div><div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-white p-1">{(["standard","large","xlarge"] as const).map((size,index)=><button key={size} aria-pressed={subtitleSize===size} onClick={()=>setSubtitleSize(size)} className={`rounded-md px-2 py-2 text-sm font-semibold transition ${subtitleSize===size?"bg-[#155eef] text-white":"text-[#52627a] hover:bg-[#edf3ff]"}`}>{["鏍囧噯","澶?,"鐗瑰ぇ"][index]}</button>)}</div></div><button aria-pressed={highContrast} onClick={()=>setHighContrast(value=>!value)} className={`rounded-xl border p-3 text-left transition ${highContrast?"border-[#155eef] bg-[#edf3ff]":"border-transparent bg-[#f5f8fc] hover:border-[#c9d8ef]"}`}><div className="flex items-center gap-2 text-sm font-semibold"><Contrast className="size-4 text-[#155eef]"/> 澧炲己瀵规瘮搴?/div><p className="mt-2 text-sm leading-6 text-[#68768c]">璁╂枃瀛椼€佽竟妗嗗拰鑳屾櫙宸紓鏇存槑鏄俱€?/p><span className="mt-2 block text-xs font-bold text-[#155eef]">{highContrast?"宸插紑鍚?:"鐐瑰嚮寮€鍚?}</span></button><button aria-pressed={focusMode} onClick={()=>setFocusMode(value=>!value)} className={`rounded-xl border p-3 text-left transition ${focusMode?"border-[#155eef] bg-[#edf3ff]":"border-transparent bg-[#f5f8fc] hover:border-[#c9d8ef]"}`}><div className="flex items-center gap-2 text-sm font-semibold"><Focus className="size-4 text-[#155eef]"/> 涓撴敞闃呰妯″紡</div><p className="mt-2 text-sm leading-6 text-[#68768c]">闅愯棌渚ф爮銆佹尝褰㈠拰杈呭姪淇℃伅銆?/p><span className="mt-2 block text-xs font-bold text-[#155eef]">{focusMode?"宸插紑鍚?:"鐐瑰嚮寮€鍚?}</span></button></div></section>}
        {fileName&&<section className="mb-5 rounded-2xl border border-[#b9cef8] bg-[#edf4ff] p-4 text-sm text-[#244b88] sm:p-5">
          <div className="flex items-center gap-3"><FileAudio className="size-5 shrink-0"/><div className="min-w-0 flex-1"><p className="truncate font-semibold">{fileName}</p><p className="mt-0.5 text-xs text-[#6680aa]">{demoMode?"鍐呯疆璇勫绀轰緥 路 鏃犻渶闊抽鎴?API Key":selectedFile?`${(selectedFile.size/1024/1024).toFixed(2)} MB 路 鏀寔 MP3銆乄AV銆丮4A銆丱GG銆乄EBM`:"鍑嗗澶勭悊"}</p></div>{uploadedTranscript?<span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4"/> {demoMode?"婕旂ず宸插氨缁?:studyGuide?"AI绗旇宸茬敓鎴?:"杞啓瀹屾垚"}</span>:<span className="text-xs font-semibold">鍑嗗澶勭悊</span>}</div>
          {!uploadedTranscript&&<div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><div><label htmlFor="dashscope-key" className="mb-1.5 block text-xs font-semibold text-[#526e9b]">寮€鍙戞祴璇曞瘑閽ワ紙浠呬繚鐣欏埌鏈〉鍏抽棴鎴栧埛鏂帮級</label><input id="dashscope-key" type="password" value={dashscopeKey} onChange={e=>setDashscopeKey(e.target.value)} placeholder="DashScope API Key" className="h-10 w-full rounded-xl border border-[#b8cbed] bg-white px-3 text-sm text-[#1c2d49] outline-none transition focus:border-[#155eef] focus:ring-2 focus:ring-[#155eef]/15"/>{transcribing&&processingStatus&&<p className="mt-2 text-xs font-semibold text-[#155eef]" aria-live="polite">{processingStatus}</p>}</div><Button className="self-end rounded-xl bg-[#155eef]" disabled={transcribing} onClick={transcribeFile}>{transcribing?<><LoaderCircle className="animate-spin"/> 澶勭悊涓?/>:<><Sparkles/> 寮€濮婣I杞啓</>}</Button></div>}
          {fileError&&<p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{fileError}</p>}
          {studyGuideWarning&&<p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">{studyGuideWarning}</p>}
          {uploadedTranscript&&<div className="mt-4 rounded-xl border border-[#c8d8f3] bg-white p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#6d7d95]"><Sparkles className="size-3.5 text-[#155eef]"/> 涓婁紶褰曢煶璇嗗埆缁撴灉</div><p className={`whitespace-pre-wrap text-[#1d2b45] ${subtitleTextClass}`}>{uploadedTranscript}</p></div>}
          <p className="mt-3 text-xs leading-5 text-[#6b7f9f]">{demoMode?"杩欐槸棰勭疆婕旂ず鍐呭锛岀敤浜庡揩閫熶綋楠屼骇鍝佹祦绋嬶紱涓婁紶鐪熷疄褰曢煶鍚庡皢璋冪敤AI鐢熸垚缁撴灉銆?:"鏀寔鏈€闀?90 鍒嗛挓銆佹渶澶?120MB 鐨勮鍫傚綍闊炽€傞暱闊抽浼氬湪娴忚鍣ㄤ腑鑷姩鍒嗘澶勭悊锛屾棤闇€鎵嬪姩鍓緫锛汚PI Key浠呴殢鏈璇锋眰鍙戦€併€?}</p>
        </section>}
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-sm text-[#60708a]"><span>{demoMode?"璇勫婕旂ず":studyGuide?"涓婁紶璇惧爞":"鏈哄櫒瀛︿範鍩虹"}</span><ChevronRight className="size-3.5"/><span>{studyGuide?"AI瀛︿範鎸囧崡":"绗?8 璁?}</span></div><h1 className="text-2xl font-bold tracking-[-0.03em] text-[#15233f] sm:text-[1.9rem]">{activeGuide.title}</h1><p className="mt-2 text-sm text-[#64738a]">{demoMode?"鏃犻渶鍑嗗鏂囦欢鎴栧瘑閽?路 鍙綋楠岄棶绛斾笌瀵煎嚭":studyGuide?`${fileName} 路 宸插畬鎴愯浆鍐欎笌鏁寸悊`:"2026骞?鏈?7鏃?路 闄堣€佸笀 路 42鍒?8绉?}</p></div><div className="flex flex-wrap gap-2"><Button variant={demoMode?"secondary":"outline"} className="rounded-xl bg-white" onClick={loadDemoClass}><Sparkles/> {demoMode?"绀轰緥宸茶浇鍏?:"浣撻獙绀轰緥璇惧爞"}</Button><Button variant="outline" className="rounded-xl bg-white" onClick={()=>setLanguage(language==="鍙岃"?"涓枃":"鍙岃")}><Globe2/> {language}瀛楀箷</Button><Button variant="outline" className="rounded-xl bg-white" disabled={!uploadedTranscript} onClick={exportStudyReport}><Download/> 瀵煎嚭瀛︿範鎶ュ憡</Button><Button variant={speech.recording?"outline":"default"} className={speech.recording?"rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100":"rounded-xl bg-[#10213f] hover:bg-[#1b3157]"} onClick={speech.recording?speech.stop:speech.start}>{speech.recording?<><Square className="fill-current"/> 鍋滄杞啓</>:<><Radio/> 寮€濮嬪疄鏃惰鍫?/>}</Button><Button className="rounded-xl bg-[#155eef]" onClick={()=>fileInput.current?.click()}><Upload/> 涓婁紶璇惧爞鏂囦欢</Button></div></div>
        {(speech.recording||speech.lines.length>0||speech.error)&&<section className="mb-5 overflow-hidden rounded-2xl border border-[#bdd0f4] bg-white shadow-[0_12px_28px_rgba(32,57,96,.07)]" aria-live="polite">
          <div className="flex items-center justify-between border-b border-[#e1e8f2] bg-[#f7faff] px-4 py-3 sm:px-5"><div className="flex items-center gap-3"><span className={`relative grid size-8 place-items-center rounded-full ${speech.recording?"bg-red-100 text-red-600":"bg-[#e8efff] text-[#155eef]"}`}><Mic2 className="size-4"/>{speech.recording&&<span className="absolute inset-0 animate-ping rounded-full bg-red-300/45"/>}</span><div><p className="text-sm font-bold">瀹炴椂璇惧爞杞啓</p><p className="text-xs text-[#6b7990]">{speech.recording?"姝ｅ湪鑱嗗惉涓枃璇煶":"宸插仠姝紝杞啓缁撴灉淇濈暀鍦ㄦ湰椤?}</p></div></div><Button variant="ghost" size="sm" onClick={speech.reset}><RotateCcw/> 娓呯┖</Button></div>
          <div className="max-h-64 overflow-y-auto px-4 py-3 sm:px-5">{speech.error&&<p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{speech.error}</p>}{speech.lines.length===0&&!speech.error&&<p className="py-5 text-center text-sm text-[#718096]">璇峰鐫€楹﹀厠椋庤璇濓紝璇嗗埆瀹屾垚鐨勫彞瀛愪細鏄剧ず鍦ㄨ繖閲屻€?/p>}{speech.lines.map((line,index)=><div key={`${line.time}-${index}`} className="grid grid-cols-[48px_1fr] gap-3 border-b border-[#edf1f6] py-3 last:border-0"><span className="pt-0.5 text-xs font-semibold tabular-nums text-[#155eef]">{line.time}</span><p className={`text-[#1d2b45] ${subtitleTextClass}`}>{line.text}</p></div>)}{speech.interim&&<div className="grid grid-cols-[48px_1fr] gap-3 py-3"><span className="pt-1 text-xs font-semibold text-red-500">璇嗗埆涓?/span><p className={`text-[#718096] ${subtitleTextClass}`}>{speech.interim}<span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[#155eef] align-middle"/></p></div>}</div>
          <div className="border-t border-[#e7edf5] px-4 py-2.5 text-xs leading-5 text-[#718096] sm:px-5">棣栨浣跨敤鏃惰鍏佽楹﹀厠椋庢潈闄愩€傚疄鏃惰瘑鍒晥鏋滃彇鍐充簬娴忚鍣ㄣ€佺綉缁滃拰鐜鍣０銆?/div>
        </section>}
        <div className={`grid gap-5 ${focusMode?"":"xl:grid-cols-[minmax(0,1fr)_336px]"}`}>
          <div className="min-w-0">
            {!focusMode&&<section className="mb-5 overflow-hidden rounded-2xl border border-[#dce4ef] bg-[#10213f] text-white shadow-[0_16px_38px_rgba(32,57,96,.09)]"><audio ref={audioRef} src={audioUrl||undefined} onLoadedMetadata={event=>setDuration(event.currentTarget.duration||0)} onTimeUpdate={event=>setCurrentTime(event.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/><div className="relative flex h-[150px] items-end gap-[5px] px-5 pb-8 sm:px-7">{waveform.map((height,index)=>{const passed=duration>0&&index/(waveform.length-1)<=currentTime/duration;return <button key={index} disabled={!audioUrl} aria-label={`璺宠浆鍒?${Math.round(index/Math.max(1,waveform.length-1)*100)}%`} onClick={()=>seekAudio([duration*index/Math.max(1,waveform.length-1)])} className={`min-w-[2px] flex-1 rounded-full transition-colors ${passed?"bg-[#5ee0c5]":"bg-[#385071]"}`} style={{height:`${height}%`}}/>})}{!audioUrl&&<div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-[#b8c8dc]">涓婁紶鐪熷疄闊抽鍚庯紝杩欓噷浼氭樉绀洪煶棰戞尝褰㈠苟鍚屾鎾斁杩涘害</div>}</div><div className="flex items-center gap-3 border-t border-white/10 bg-white/[.04] px-4 py-3 sm:px-6"><Button size="icon" className="size-10 rounded-full bg-[#5ee0c5] text-[#10213f] hover:bg-[#70ead1]" disabled={!audioUrl} onClick={togglePlayback} aria-label={playing?"鏆傚仠":"鎾斁"}>{playing?<Pause/>:<Play className="translate-x-px"/>}</Button><span className="text-sm tabular-nums text-[#d8e4f5]">{formatTime(currentTime)}</span><Slider value={[currentTime]} min={0} max={duration||1} step={0.1} disabled={!audioUrl} onValueChange={seekAudio} aria-label="闊抽鎾斁杩涘害" className="flex-1 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-[#5ee0c5] [&_[data-slot=slider-thumb]]:border-[#5ee0c5]"/><span className="text-sm tabular-nums text-[#9fb1ca]">{formatTime(duration)}</span><Volume2 className="size-4 text-[#b8c8dc]"/></div></section>}
            <Tabs defaultValue="transcript" className="rounded-2xl border border-[#dce4ef] bg-white shadow-[0_12px_28px_rgba(32,57,96,.06)]"><div className="flex items-center justify-between border-b border-[#e3e9f1] px-4 pt-3 sm:px-6"><TabsList variant="line" className="h-11 gap-2 sm:gap-5"><TabsTrigger value="transcript"><Mic2/> <span className="hidden sm:inline">瀹炴椂</span>杞啓</TabsTrigger><TabsTrigger value="notes"><BookOpenText/> 璇惧爞绗旇</TabsTrigger><TabsTrigger value="questions"><MessageCircleMore/> 鎻愰棶璁板綍</TabsTrigger></TabsList><span className="hidden rounded-full bg-[#e8f8f4] px-2.5 py-1 text-xs font-semibold text-[#15745f] sm:inline">璇嗗埆瀹屾垚 98%</span></div>
              <TabsContent value="transcript" className={`${focusMode?"max-h-none":"max-h-[455px]"} overflow-y-auto px-4 py-3 sm:px-6`}>{uploadedTranscript?<article className="py-5"><p className="mb-2 text-xs font-semibold text-[#66758d]">涓婁紶褰曢煶 路 AI閫愬瓧绋?/p><p className={`whitespace-pre-wrap text-[#1d2b45] ${subtitleTextClass}`}>{uploadedTranscript}</p></article>:transcript.map(item=><article key={item.time} className={`grid grid-cols-[48px_1fr] gap-2 border-b border-[#edf1f6] py-5 last:border-0 sm:grid-cols-[58px_1fr] ${item.active?"-mx-3 rounded-xl border-transparent bg-[#f1f6ff] px-3":""}`}><button className="pt-0.5 text-left text-xs font-semibold tabular-nums text-[#155eef]">{item.time}</button><div><p className="mb-2 text-xs font-semibold text-[#66758d]">{item.speaker}</p><p className={`text-[#1d2b45] ${subtitleTextClass}`}>{item.text}</p>{language==="鍙岃"&&<p className={`mt-2 text-[#738198] ${subtitleSize==="xlarge"?"text-lg leading-8":subtitleSize==="large"?"text-base leading-7":"text-sm leading-6"}`}>{item.translation}</p>}</div></article>)}</TabsContent>
              <TabsContent value="notes" className="p-6"><h2 className="font-bold">鏈妭璇剧煡璇嗙粨鏋?/h2><ul className="mt-4 space-y-3 text-sm leading-6 text-[#52627a]">{activeGuide.keyPoints.map((item,index)=><li key={item}>{index+1}. {item}</li>)}</ul></TabsContent>
              <TabsContent value="questions" className="p-6">{qaHistory.length?<><h2 className="font-bold">璇惧爞闂瓟璁板綍</h2><div className="mt-4 space-y-4">{qaHistory.map((item,index)=><article key={`${item.question}-${index}`} className="rounded-xl border border-[#e1e8f2] p-4"><p className="font-semibold text-[#1d2b45]">Q锛歿item.question}</p><p className="mt-2 text-sm leading-7 text-[#52627a]">{item.answer}</p>{item.citations.length>0&&<div className="mt-3 space-y-2">{item.citations.map(citation=><blockquote key={citation.quote} className="border-l-2 border-[#155eef] pl-3 text-sm leading-6 text-[#66758d]">鈥渰citation.quote}鈥?/blockquote>)}</div>}</article>)}</div></>:<><h2 className="font-bold">澶嶄範闂</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-[#52627a]">{activeGuide.reviewQuestions.map((item,index)=><li key={item} className="rounded-xl bg-[#f5f8fc] px-4 py-3"><span className="mr-2 font-bold text-[#155eef]">Q{index+1}</span>{item}</li>)}</ul></>}</TabsContent>
            </Tabs>
          </div>
          <aside className={`${focusMode?"hidden":"space-y-5"}`}>
            <section className="rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-[0_12px_28px_rgba(32,57,96,.06)]"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#e8efff] text-[#155eef]"><Sparkles className="size-4"/></span><h2 className="font-bold">AI 璇惧爞閫熻</h2></div><p className="mt-4 text-sm leading-6 text-[#516179]">{activeGuide.summary}</p><div className="mt-5 space-y-3">{activeGuide.keyPoints.map((item,index)=><div key={item} className="flex items-start gap-3 rounded-xl bg-[#f5f8fc] px-3 py-2.5 text-sm font-medium leading-6 text-[#34445f]"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-white text-xs font-bold text-[#155eef] shadow-sm">{index+1}</span>{item}</div>)}</div></section>
            <section className="rounded-2xl bg-[#155eef] p-5 text-white shadow-[0_16px_34px_rgba(21,94,239,.22)]"><div className="flex items-center gap-2 font-bold"><MessageCircleMore className="size-5"/> 闂棶杩欒妭璇?/div><p className="mt-2 text-sm leading-6 text-blue-100">绛旀鍙緷鎹凡涓婁紶鐨勯€愬瓧绋匡紝骞跺紩鐢ㄨ鍫傚師璇濄€?/p>{demoMode&&<div className="mt-3 flex flex-wrap gap-2">{["鍒嗙被鍜屽洖褰掓湁浠€涔堝尯鍒紵","浠€涔堟槸杩囨嫙鍚堬紵","鑰佸笀甯冪疆浜嗕粈涔堜綔涓氾紵"].map(item=><button key={item} onClick={()=>setQuestion(item)} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20">{item}</button>)}</div>}<div className="mt-4 rounded-xl bg-white p-1.5 shadow-sm"><label htmlFor="question" className="sr-only">杈撳叆璇惧爞闂</label><textarea id="question" rows={3} value={question} onChange={e=>setQuestion(e.target.value)} className="w-full resize-none rounded-lg px-3 py-2 text-sm text-[#1f2d46] outline-none" placeholder={demoMode?"鐐瑰嚮涓婃柟绀轰緥闂锛屾垨杈撳叆鍏抽敭璇嶄綋楠?:uploadedTranscript?"渚嬪锛氳€佸笀濡備綍瑙ｉ噴杩欎釜姒傚康锛?:"璇峰厛涓婁紶涓€娈佃鍫傚綍闊?}/><Button className="h-9 w-full rounded-lg bg-[#10213f] hover:bg-[#1b3157]" disabled={asking||!uploadedTranscript} onClick={askAboutClass}>{asking?<><LoaderCircle className="animate-spin"/> 姝ｅ湪鏌ユ壘鍘熸枃</>:<>{demoMode?"婕旂ず鍥炵瓟":"鎻愰棶骞跺紩鐢ㄥ師鏂?} <ChevronRight/></>}</Button></div>{askError&&<p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm leading-6 text-white">{askError}</p>}{qaHistory[0]&&<div className="mt-4 rounded-xl bg-white/10 p-3"><p className="text-xs font-semibold text-blue-100">鏈€鏂板洖绛?/p><p className="mt-1 text-sm leading-6">{qaHistory[0].answer}</p>{qaHistory[0].citations[0]&&<blockquote className="mt-2 border-l-2 border-[#5ee0c5] pl-3 text-xs leading-5 text-blue-100">鈥渰qaHistory[0].citations[0].quote}鈥?/blockquote>}</div>}</section>
            <section className="rounded-2xl border border-[#dce4ef] bg-white p-5"><div className="flex items-center gap-2 font-bold"><ListChecks className="size-5 text-[#155eef]"/> 璇惧悗浠诲姟</div>{activeGuide.tasks.length?<ul className="mt-3 space-y-2 text-sm leading-6 text-[#5d6c83]">{activeGuide.tasks.map(item=><li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-[#155eef]"/>{item}</li>)}</ul>:<p className="mt-3 text-sm leading-6 text-[#7a879a]">閫愬瓧绋夸腑娌℃湁鏄庣‘甯冪疆璇惧悗浠诲姟銆?/p>}</section>
          </aside>
        </div>
      </section>
    </div>
  </main>;
}

