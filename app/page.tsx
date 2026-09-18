"use client";

import { useEffect, useRef, useState } from "react";
import { Accessibility, AudioLines, BookOpenText, CheckCircle2, ChevronRight, CircleHelp, Contrast, Download, FileAudio, Focus, Globe2, Headphones, ListChecks, LoaderCircle, MessageCircleMore, Mic2, Pause, Play, Plus, Radio, RotateCcw, Sparkles, Square, Trash2, Type, Upload, Volume2, VolumeX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

const bars = [28,42,64,38,74,55,88,52,36,68,45,82,58,94,46,66,38,76,54,34,70,44,86,62,40,72,50,80,36,64,48,90,56,42,76,52,68,34,60,46];
const MAX_UPLOAD_BYTES = 120 * 1024 * 1024;
const MAX_CLASS_SECONDS = 90 * 60;
const CHUNK_SECONDS = 180;
const OUTPUT_SAMPLE_RATE = 16000;
const RECENT_CLASSES_KEY = "echobridge-recent-classes-v1";
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

type UserNote = {
  id: string;
  content: string;
  createdAt: string;
};

const sampleGuide: StudyGuide = {
  title: "监督学习：分类、回归与过拟合",
  summary: "本节课介绍监督学习中分类与回归的区别，以及训练集、测试集和过拟合的含义，并说明了增加数据、降低模型复杂度和正则化等改进方法。",
  keyPoints: ["监督学习使用带标签的数据学习输入与输出之间的关系。","分类预测离散类别，回归预测连续数值。","训练集用于学习参数，测试集用于评估模型对新数据的表现。","训练表现好但测试表现明显变差，通常意味着过拟合。","错误标签可能让模型学到错误规律。"],
  tasks: ["完成教材第三章第一到第四题。","分别举出一个分类问题和一个回归问题。"],
  reviewQuestions: ["分类和回归的核心区别是什么？","什么是过拟合？","老师布置了什么课后任务？"],
};

const demoTranscript = "同学们好，今天我们学习监督学习中的分类与回归。监督学习使用带有标签的数据，让模型学习输入和输出之间的关系。分类任务预测离散类别，例如判断一封邮件是正常邮件还是垃圾邮件；回归任务预测连续数值，例如根据面积、位置和房龄预测房价。训练模型时，我们通常把数据分成训练集和测试集。训练集用于学习参数，测试集用于评估模型面对新数据时的表现。如果模型在训练集上很好，但在测试集上明显变差，这种现象叫作过拟合。减少过拟合的方法包括增加训练数据、降低模型复杂度和使用正则化。还要注意标签质量，错误标签会让模型学到错误规律。今天的课后任务是：完成教材第三章第一到第四题，并分别举出一个分类问题和一个回归问题。下节课我们会学习准确率、精确率和召回率。";
const demoTranslation = "Hello everyone. Today we are learning about classification and regression in supervised learning. Supervised learning uses labeled data so that a model can learn the relationship between inputs and outputs. Classification predicts discrete categories, such as whether an email is normal or spam, while regression predicts continuous values, such as a house price based on its size, location, and age. During training, data is usually divided into a training set and a test set. The training set is used to learn parameters, and the test set evaluates performance on new data. When a model performs well on the training set but much worse on the test set, this is called overfitting. Ways to reduce overfitting include adding training data, reducing model complexity, and using regularization. Label quality also matters because incorrect labels can teach the model incorrect patterns. Today's homework is to complete Questions 1 through 4 in Chapter 3 and give one example each of a classification problem and a regression problem. In the next class, we will study accuracy, precision, and recall.";

type RecentSession = {
  id: string;
  title: string;
  meta: string;
  fileName: string;
  transcript: string;
  translation: string;
  guide: StudyGuide|null;
  notes: UserNote[];
  qaHistory: QAItem[];
  isDemo: boolean;
  file?: File;
};

const demoSession:RecentSession={id:"demo-class",title:sampleGuide.title,meta:"内置示例 · 约2分钟",fileName:"EchoBridge 示例课堂",transcript:demoTranscript,translation:demoTranslation,guide:sampleGuide,notes:[],qaHistory:[],isDemo:true};

export default function Home() {
  const fileInput = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const decodedAudioRef = useRef<AudioBuffer|null>(null);
  const decodedFileRef = useRef<File|null>(null);
  const [playing,setPlaying] = useState(false);
  const [audioUrl,setAudioUrl] = useState("");
  const [currentTime,setCurrentTime] = useState(0);
  const [duration,setDuration] = useState(0);
  const [volume,setVolume] = useState(0.8);
  const [muted,setMuted] = useState(false);
  const [waveform,setWaveform] = useState(bars);
  const [fileName,setFileName] = useState("");
  const [selectedFile,setSelectedFile] = useState<File|null>(null);
  const [dashscopeKey,setDashscopeKey] = useState("");
  const [transcribing,setTranscribing] = useState(false);
  const [processingStatus,setProcessingStatus] = useState("");
  const [fileError,setFileError] = useState("");
  const [uploadedTranscript,setUploadedTranscript] = useState("");
  const [translatedTranscript,setTranslatedTranscript] = useState("");
  const [translating,setTranslating] = useState(false);
  const [translationError,setTranslationError] = useState("");
  const [studyGuide,setStudyGuide] = useState<StudyGuide|null>(null);
  const [studyGuideWarning,setStudyGuideWarning] = useState("");
  const [generatingGuide,setGeneratingGuide] = useState(false);
  const [notes,setNotes] = useState<UserNote[]>([]);
  const [noteDraft,setNoteDraft] = useState("");
  const [editingNoteId,setEditingNoteId] = useState<string|null>(null);
  const [editingNoteText,setEditingNoteText] = useState("");
  const [question,setQuestion] = useState("");
  const [asking,setAsking] = useState(false);
  const [askError,setAskError] = useState("");
  const [qaHistory,setQaHistory] = useState<QAItem[]>([]);
  const [language,setLanguage] = useState<"双语"|"中文">("中文");
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
      const valid=saved.filter(item=>item&&typeof item.id==="string"&&typeof item.transcript==="string"&&!item.isDemo).slice(0,8).map(item=>({...item,translation:typeof item.translation==="string"?item.translation:"",notes:Array.isArray(item.notes)?item.notes:[],qaHistory:Array.isArray(item.qaHistory)?item.qaHistory:[]}));
      setRecentSessions([...valid,demoSession]);
    } catch {
      localStorage.removeItem(RECENT_CLASSES_KEY);
    }
  },[]);

  function persistRecentSessions(items:RecentSession[]) {
    const stored=items.filter(item=>!item.isDemo).slice(0,8).map(({file:_,...item})=>item);
    try { localStorage.setItem(RECENT_CLASSES_KEY,JSON.stringify(stored)); } catch { /* 浏览器空间不足时仍保留当前页面内容 */ }
  }

  function updateActiveSession(patch:Partial<RecentSession>) {
    if(!activeSessionId) return;
    setRecentSessions(items=>{
      const next=items.map(item=>item.id===activeSessionId?{...item,...patch}:item);
      persistRecentSessions(next);
      return next;
    });
  }

  function replaceNotes(next:UserNote[]) {
    setNotes(next);
    updateActiveSession({notes:next});
  }

  function replaceQaHistory(next:QAItem[]) {
    setQaHistory(next);
    updateActiveSession({qaHistory:next});
  }

  function addNote() {
    const content=noteDraft.trim();
    if(!content) return;
    const next=[{id:`note-${Date.now()}`,content,createdAt:new Date().toLocaleString("zh-CN")},...notes];
    replaceNotes(next);
    setNoteDraft("");
  }

  function beginEditNote(note:UserNote) {
    setEditingNoteId(note.id);
    setEditingNoteText(note.content);
  }

  function saveEditedNote() {
    const content=editingNoteText.trim();
    if(!editingNoteId||!content) return;
    replaceNotes(notes.map(note=>note.id===editingNoteId?{...note,content}:note));
    setEditingNoteId(null);
    setEditingNoteText("");
  }

  function removeNote(id:string) {
    replaceNotes(notes.filter(note=>note.id!==id));
    if(editingNoteId===id) {
      setEditingNoteId(null);
      setEditingNoteText("");
    }
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

  function changeVolume(value:number[]) {
    const next=Math.max(0,Math.min(1,value[0]??0));
    setVolume(next);
    setMuted(next===0);
    if(audioRef.current) {
      audioRef.current.volume=next;
      audioRef.current.muted=next===0;
    }
  }

  function toggleMuted() {
    const next=!muted;
    setMuted(next);
    if(audioRef.current) audioRef.current.muted=next;
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
    setTranslatedTranscript("");
    setTranslationError("");
    setLanguage("中文");
    setStudyGuide(null);
    setStudyGuideWarning("");
    setNotes([]);
    setNoteDraft("");
    setEditingNoteId(null);
    setQuestion("");
    setAskError("");
    setQaHistory([]);
  }

  async function transcribeFile() {
    if (!selectedFile) return;
    if (selectedFile.size > MAX_UPLOAD_BYTES) {
      setFileError("文件超过 120MB。建议先导出为 MP3 或 M4A，再重新上传。");
      return;
    }
    setTranscribing(true);
    setFileError("");
    setUploadedTranscript("");
    setTranslatedTranscript("");
    setTranslationError("");
    setLanguage("中文");
    setStudyGuide(null);
    setStudyGuideWarning("");
    try {
      const headers: HeadersInit = {};
      if (dashscopeKey.trim()) headers["x-dashscope-api-key"] = dashscopeKey.trim();
      setProcessingStatus("正在读取课堂音频…");
      const decoded=await decodeAudio(selectedFile);
      if(decoded.duration>MAX_CLASS_SECONDS) throw new Error("当前支持最长 90 分钟的课堂录音。");
      const chunkCount=Math.ceil(decoded.duration/CHUNK_SECONDS);
      const texts:string[]=[];
      for(let index=0;index<chunkCount;index++) {
        setProcessingStatus(`正在转写第 ${index+1}/${chunkCount} 段…`);
        const start=index*CHUNK_SECONDS;
        const blob=encodeWavChunk(decoded,start,Math.min(decoded.duration,start+CHUNK_SECONDS));
        const body=new FormData();
        body.append("file",blob,`${selectedFile.name}-part-${index+1}.wav`);
        body.append("createNotes","false");
        const response=await fetch("/api/transcribe",{method:"POST",headers,body});
        const result=await response.json() as {text?:string;error?:string};
        if(!response.ok||!result.text) throw new Error(result.error||`第 ${index+1} 段转写失败，请重试。`);
        texts.push(result.text);
      }
      const fullTranscript=texts.join("\n\n");
      setUploadedTranscript(fullTranscript);
      setProcessingStatus("正在整理 AI 学习笔记…");
      const guideResponse=await fetch("/api/study-guide",{method:"POST",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({transcript:fullTranscript})});
      const guideResult=await guideResponse.json() as {studyGuide?:StudyGuide;error?:string};
      const finalGuide=guideResponse.ok?guideResult.studyGuide||null:null;
      setStudyGuide(finalGuide);
      setStudyGuideWarning(finalGuide?"":guideResult.error||"逐字稿已生成，但AI笔记暂时整理失败。");
      const sessionId=`class-${Date.now()}`;
      const saved:RecentSession={id:sessionId,title:finalGuide?.title||selectedFile.name,meta:`刚刚 · ${formatTime(decoded.duration)} · 已完成`,fileName:selectedFile.name,transcript:fullTranscript,translation:"",guide:finalGuide,notes:[],qaHistory:[],isDemo:false,file:selectedFile};
      setRecentSessions(items=>{
        const next=[saved,...items.filter(item=>item.id!==sessionId)];
        persistRecentSessions(next);
        return [...next.filter(item=>!item.isDemo).slice(0,8),next.find(item=>item.isDemo)||demoSession];
      });
      setActiveSessionId(sessionId);
    } catch (error) {
      setFileError(error instanceof Error?error.message:"转写失败，请稍后重试。");
    } finally {
      setTranscribing(false);
      setProcessingStatus("");
    }
  }

  async function generateStudyGuide() {
    if(!uploadedTranscript) {
      setStudyGuideWarning("请先完成课堂录音转写，再生成课堂速览。");
      return;
    }
    setGeneratingGuide(true);
    setStudyGuideWarning("");
    try {
      const headers:HeadersInit={"Content-Type":"application/json"};
      if(dashscopeKey.trim()) headers["x-dashscope-api-key"]=dashscopeKey.trim();
      const response=await fetch("/api/study-guide",{method:"POST",headers,body:JSON.stringify({transcript:uploadedTranscript})});
      const result=await response.json() as {studyGuide?:StudyGuide;error?:string};
      if(!response.ok||!result.studyGuide) throw new Error(result.error||"课堂速览生成失败，请稍后重试。");
      setStudyGuide(result.studyGuide);
      updateActiveSession({guide:result.studyGuide,title:result.studyGuide.title});
    } catch(error) {
      setStudyGuideWarning(error instanceof Error?error.message:"课堂速览生成失败，请稍后重试。");
    } finally {
      setGeneratingGuide(false);
    }
  }

  async function toggleBilingual() {
    if(language==="双语") {
      setLanguage("中文");
      setTranslationError("");
      return;
    }
    if(!uploadedTranscript) {
      setTranslationError("请先完成课堂转写，再生成双语字幕。");
      return;
    }
    if(translatedTranscript) {
      setLanguage("双语");
      setTranslationError("");
      return;
    }
    setTranslating(true);
    setTranslationError("");
    try {
      const headers:HeadersInit={"Content-Type":"application/json"};
      if(dashscopeKey.trim()) headers["x-dashscope-api-key"]=dashscopeKey.trim();
      const response=await fetch("/api/translate",{method:"POST",headers,body:JSON.stringify({transcript:uploadedTranscript})});
      const result=await response.json() as {translation?:string;error?:string};
      if(!response.ok||!result.translation) throw new Error(result.error||"双语字幕生成失败，请稍后重试。");
      setTranslatedTranscript(result.translation);
      setLanguage("双语");
      updateActiveSession({translation:result.translation});
    } catch(error) {
      setTranslationError(error instanceof Error?error.message:"双语字幕生成失败，请稍后重试。");
    } finally {
      setTranslating(false);
    }
  }

  async function askAboutClass() {
    const cleanQuestion = question.trim();
    if (!uploadedTranscript) {
      setAskError("请先上传并完成一段课堂录音的转写。");
      return;
    }
    if (!cleanQuestion) {
      setAskError("先写下你想问的问题。");
      return;
    }
    if (demoMode) {
      const answer = cleanQuestion.includes("作业")||cleanQuestion.includes("任务")
        ? {answer:"老师布置了两项任务：完成教材第三章第一到第四题，并各举出一个分类问题和回归问题。",citations:[{quote:"今天的课后任务是：完成教材第三章第一到第四题，并分别举出一个分类问题和一个回归问题。",reason:"原文直接说明了两项课后任务。"}]}
        : cleanQuestion.includes("过拟合")
          ? {answer:"过拟合是模型在训练集上表现很好，但面对测试集的新数据时表现明显变差。课堂还给出了增加数据、降低复杂度和使用正则化三种改进方法。",citations:[{quote:"如果模型在训练集上很好，但在测试集上明显变差，这种现象叫作过拟合。",reason:"原文给出了过拟合的定义。"},{quote:"减少过拟合的方法包括增加训练数据、降低模型复杂度和使用正则化。",reason:"原文列出了三种缓解方法。"}]}
          : cleanQuestion.includes("分类")||cleanQuestion.includes("回归")
            ? {answer:"分类任务预测离散类别，例如判断邮件类型；回归任务预测连续数值，例如预测房价。",citations:[{quote:"分类任务预测离散类别，例如判断一封邮件是正常邮件还是垃圾邮件；回归任务预测连续数值，例如根据面积、位置和房龄预测房价。",reason:"原文直接对比了两类任务并给出例子。"}]}
            : {answer:"这段示例课堂中没有足够信息回答该问题。你可以尝试询问分类与回归、过拟合或课后任务。",citations:[]};
      replaceQaHistory([{question:cleanQuestion,...answer},...qaHistory]);
      setQuestion("");
      setAskError("");
      return;
    }
    setAsking(true);
    setAskError("");
    try {
      const headers:HeadersInit={"Content-Type":"application/json"};
      if(dashscopeKey.trim()) headers["x-dashscope-api-key"]=dashscopeKey.trim();
      const response = await fetch("/api/ask",{
        method:"POST",
        headers,
        body:JSON.stringify({question:cleanQuestion,transcript:uploadedTranscript}),
      });
      const result = await response.json() as {answer?:string;citations?:QAItem["citations"];error?:string};
      if (!response.ok||!result.answer) throw new Error(result.error||"暂时无法回答，请稍后重试。");
      replaceQaHistory([{question:cleanQuestion,answer:result.answer!,citations:result.citations||[]},...qaHistory]);
      setQuestion("");
    } catch (error) {
      setAskError(error instanceof Error?error.message:"暂时无法回答，请稍后重试。");
    } finally {
      setAsking(false);
    }
  }

  function loadDemoClass() {
    setDemoMode(true);
    setSelectedFile(null);
    setFileName("EchoBridge 示例课堂");
    setUploadedTranscript(demoTranscript);
    setTranslatedTranscript(demoTranslation);
    setLanguage("双语");
    setTranslationError("");
    setStudyGuide(sampleGuide);
    setStudyGuideWarning("");
    setFileError("");
    setQuestion("");
    setAskError("");
    setNotes([]);
    setNoteDraft("");
    setEditingNoteId(null);
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
    setTranslatedTranscript(session.translation||"");
    setLanguage(session.translation?"双语":"中文");
    setTranslationError("");
    setStudyGuide(session.guide);
    setStudyGuideWarning("");
    setFileError("");
    setQuestion("");
    setAskError("");
    setNotes(session.notes||[]);
    setNoteDraft("");
    setEditingNoteId(null);
    setQaHistory(session.qaHistory||[]);
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
      setTranslatedTranscript("");
      setLanguage("中文");
      setTranslationError("");
      setStudyGuide(null);
      setNotes([]);
      setNoteDraft("");
      setEditingNoteId(null);
      setQaHistory([]);
      setAudioFile();
    }
  }

  function exportStudyReport() {
    if (!uploadedTranscript) return;
    const guide=activeGuide||{title:fileName||"课堂学习报告",summary:"尚未生成 AI 课堂速览。",keyPoints:[],tasks:[],reviewQuestions:[]};
    const reportWindow = window.open("","_blank");
    if (!reportWindow) {
      setFileError("浏览器阻止了报告窗口，请允许弹出窗口后再试。");
      return;
    }
    reportWindow.opener = null;
    const escapeHtml = (value:string) => value.replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char]!));
    const list = (items:string[],empty:string) => items.length
      ? `<ol>${items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ol>`
      : `<p class="muted">${escapeHtml(empty)}</p>`;
    const questions = qaHistory.length
      ? qaHistory.map(item=>`<article class="qa"><h3>问题：${escapeHtml(item.question)}</h3><p>${escapeHtml(item.answer)}</p>${item.citations.map(citation=>`<blockquote>“${escapeHtml(citation.quote)}”<small>${escapeHtml(citation.reason)}</small></blockquote>`).join("")}</article>`).join("")
      : `<p class="muted">本次课堂还没有提问记录。</p>`;
    const userNotes = notes.length
      ? notes.map(note=>`<article class="qa"><p>${escapeHtml(note.content)}</p><small>${escapeHtml(note.createdAt)}</small></article>`).join("")
      : `<p class="muted">本次课堂还没有手动笔记。</p>`;
    reportWindow.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(guide.title)}｜EchoBridge学习报告</title><style>
      @page{size:A4;margin:18mm}*{box-sizing:border-box}body{margin:0;color:#17233d;font:15px/1.75 -apple-system,BlinkMacSystemFont,"Segoe UI","Microsoft YaHei",sans-serif}header{padding-bottom:24px;border-bottom:3px solid #155eef}.brand{color:#155eef;font-weight:800;letter-spacing:.04em}.meta,.muted{color:#68768c}h1{margin:8px 0 4px;font-size:28px}h2{margin:28px 0 10px;font-size:18px;color:#163f8f}h3{margin:0 0 8px;font-size:15px}section{break-inside:avoid}ol{margin:8px 0;padding-left:24px}li{margin:7px 0}.summary{padding:16px 18px;border-left:4px solid #155eef;background:#f3f7ff;border-radius:0 10px 10px 0}.transcript{white-space:pre-wrap;padding:16px;background:#f6f8fb;border:1px solid #dfe6ef;border-radius:10px}.qa{margin:12px 0;padding:14px 16px;border:1px solid #dfe6ef;border-radius:10px}blockquote{margin:10px 0 0;padding:9px 12px;border-left:3px solid #5acdb7;background:#f4fbf9;color:#40516c}small{display:block;margin-top:4px;color:#758198}footer{margin-top:32px;padding-top:12px;border-top:1px solid #dfe6ef;color:#7a8799;font-size:12px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body><header><div class="brand">ECHOBRIDGE · AI CLASS NOTE</div><h1>${escapeHtml(guide.title)}</h1><div class="meta">文件：${escapeHtml(fileName)} · 导出时间：${escapeHtml(new Date().toLocaleString("zh-CN"))}</div></header>
    <main><section><h2>课堂摘要</h2><p class="summary">${escapeHtml(guide.summary)}</p></section><section><h2>核心知识点</h2>${list(guide.keyPoints,"未提取到知识点。")}</section><section><h2>我的课堂笔记</h2>${userNotes}</section><section><h2>课后任务</h2>${list(guide.tasks,"逐字稿中没有明确布置课后任务。")}</section><section><h2>课堂问答</h2>${questions}</section><section><h2>完整逐字稿</h2><div class="transcript">${escapeHtml(uploadedTranscript)}</div></section></main><footer>由 EchoBridge 根据课堂录音生成。AI内容可能存在误差，请结合课堂原文核对。</footer></body></html>`);
    reportWindow.document.close();
    reportWindow.focus();
    window.setTimeout(()=>reportWindow.print(),350);
  }

  const activeGuide = demoMode?sampleGuide:studyGuide;
  const displayTitle = activeGuide?.title||fileName||"新课堂";
  const subtitleTextClass = subtitleSize==="xlarge"?"text-[1.3rem] leading-9":subtitleSize==="large"?"text-[1.15rem] leading-8":"text-[1rem] leading-7";

  return <main className={`min-h-screen bg-[#f4f7fb] text-[#14213d] ${highContrast?"echo-high-contrast":""}`}>
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[#dbe4f0] bg-white/90 px-4 backdrop-blur-xl sm:px-7">
      <div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[#155eef] text-white shadow-[0_7px_18px_rgba(21,94,239,.24)]"><AudioLines className="size-5"/></span><div><p className="text-[1.05rem] font-bold tracking-[-0.02em]">EchoBridge</p><p className="text-xs text-[#61708a]">让每一句课堂内容都能被理解</p></div></div>
      <div className="flex items-center gap-2"><Button variant={a11yOpen?"secondary":"ghost"} size="sm" aria-expanded={a11yOpen} onClick={()=>setA11yOpen(value=>!value)}><Accessibility/><span className="hidden sm:inline">无障碍</span></Button><Button variant="ghost" size="icon" aria-label="帮助"><CircleHelp/></Button><div className="grid size-9 place-items-center rounded-full bg-[#e8efff] text-sm font-bold text-[#155eef]">DR</div></div>
    </header>

    <div className={`mx-auto grid max-w-[1540px] grid-cols-1 ${focusMode?"":"lg:grid-cols-[236px_minmax(0,1fr)]"}`}>
      <aside className={`${focusMode?"hidden":"hidden lg:block"} min-h-[calc(100vh-64px)] border-r border-[#dbe4f0] bg-white px-4 py-5`}>
        <input ref={fileInput} className="hidden" type="file" accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm" onChange={e=>selectAudio(e.target.files?.[0])}/>
        <Button className="h-11 w-full rounded-xl bg-[#155eef] shadow-[0_8px_18px_rgba(21,94,239,.2)]" onClick={()=>fileInput.current?.click()}><Plus/> 新建课堂</Button>
        <nav className="mt-7" aria-label="课堂记录"><div className="mb-3 flex items-center justify-between px-2"><span className="text-xs font-semibold uppercase tracking-[0.08em] text-[#78859b]">最近课堂</span><span className="rounded-full bg-[#edf3ff] px-2 py-0.5 text-xs font-semibold text-[#155eef]">{recentSessions.length}</span></div><div className="space-y-1.5">{recentSessions.map(session=><div key={session.id} className={`group flex items-center rounded-xl transition ${activeSessionId===session.id?"bg-[#edf3ff] text-[#124bc0]":"text-[#4f5e76] hover:bg-[#f4f7fb]"}`}><button aria-current={activeSessionId===session.id?"page":undefined} onClick={()=>openRecentSession(session)} className="min-w-0 flex-1 px-3 py-3 text-left"><span className="block truncate text-sm font-semibold">{session.title}</span><span className="mt-1 block text-xs opacity-70">{session.meta}</span></button>{!session.isDemo&&<button aria-label={`删除课堂：${session.title}`} title="删除记录" onClick={()=>removeRecentSession(session.id)} className="mr-2 grid size-8 shrink-0 place-items-center rounded-lg text-[#8794a8] opacity-70 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"><Trash2 className="size-4"/></button>}</div>)}</div><p className="mt-3 px-2 text-xs leading-5 text-[#8a96a8]">逐字稿与笔记保存在本机浏览器；刷新后仍可查看。为保护隐私，原始音频不会保存。</p></nav>
        <div className="mt-8 rounded-2xl border border-[#dce6f5] bg-[#f7faff] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-[#29405f]"><Headphones className="size-4 text-[#155eef]"/> 无障碍模式</div><p className="mt-2 text-xs leading-5 text-[#6a7890]">调整字幕字号、画面对比度和阅读布局。</p><Button variant="outline" size="sm" className="mt-3 w-full bg-white" onClick={()=>setA11yOpen(true)}>打开设置</Button></div>
      </aside>

      <section className={`min-w-0 px-4 py-5 sm:px-7 sm:py-7 ${focusMode?"mx-auto w-full max-w-5xl":""}`}>
        {a11yOpen&&<section className="mb-5 rounded-2xl border border-[#b9cef8] bg-white p-4 shadow-[0_12px_28px_rgba(32,57,96,.07)] sm:p-5" aria-label="无障碍设置"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 font-bold text-[#18345f]"><Accessibility className="size-5 text-[#155eef]"/> 无障碍学习设置</div><p className="mt-1 text-sm leading-6 text-[#697890]">设置立即生效，只影响当前页面。</p></div><div className="flex items-center gap-1"><Button variant="ghost" size="sm" onClick={()=>{setSubtitleSize("standard");setHighContrast(false);setFocusMode(false)}}><RotateCcw/> 恢复默认</Button><Button variant="ghost" size="icon" aria-label="关闭无障碍设置" onClick={()=>setA11yOpen(false)}><X/></Button></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><div className="rounded-xl bg-[#f5f8fc] p-3"><div className="flex items-center gap-2 text-sm font-semibold"><Type className="size-4 text-[#155eef]"/> 字幕字号</div><div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-white p-1">{(["standard","large","xlarge"] as const).map((size,index)=><button key={size} aria-pressed={subtitleSize===size} onClick={()=>setSubtitleSize(size)} className={`rounded-md px-2 py-2 text-sm font-semibold transition ${subtitleSize===size?"bg-[#155eef] text-white":"text-[#52627a] hover:bg-[#edf3ff]"}`}>{["标准","大","特大"][index]}</button>)}</div></div><button aria-pressed={highContrast} onClick={()=>setHighContrast(value=>!value)} className={`rounded-xl border p-3 text-left transition ${highContrast?"border-[#155eef] bg-[#edf3ff]":"border-transparent bg-[#f5f8fc] hover:border-[#c9d8ef]"}`}><div className="flex items-center gap-2 text-sm font-semibold"><Contrast className="size-4 text-[#155eef]"/> 增强对比度</div><p className="mt-2 text-sm leading-6 text-[#68768c]">让文字、边框和背景差异更明显。</p><span className="mt-2 block text-xs font-bold text-[#155eef]">{highContrast?"已开启":"点击开启"}</span></button><button aria-pressed={focusMode} onClick={()=>setFocusMode(value=>!value)} className={`rounded-xl border p-3 text-left transition ${focusMode?"border-[#155eef] bg-[#edf3ff]":"border-transparent bg-[#f5f8fc] hover:border-[#c9d8ef]"}`}><div className="flex items-center gap-2 text-sm font-semibold"><Focus className="size-4 text-[#155eef]"/> 专注阅读模式</div><p className="mt-2 text-sm leading-6 text-[#68768c]">隐藏侧栏、波形和辅助信息。</p><span className="mt-2 block text-xs font-bold text-[#155eef]">{focusMode?"已开启":"点击开启"}</span></button></div></section>}
        {fileName&&<section className="mb-5 rounded-2xl border border-[#b9cef8] bg-[#edf4ff] p-4 text-sm text-[#244b88] sm:p-5">
          <div className="flex items-center gap-3"><FileAudio className="size-5 shrink-0"/><div className="min-w-0 flex-1"><p className="truncate font-semibold">{fileName}</p><p className="mt-0.5 text-xs text-[#6680aa]">{demoMode?"内置评审示例 · 无需音频或 API Key":selectedFile?`${(selectedFile.size/1024/1024).toFixed(2)} MB · 支持 MP3、WAV、M4A、OGG、WEBM`:"准备处理"}</p></div>{uploadedTranscript?<span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4"/> {demoMode?"演示已就绪":studyGuide?"AI笔记已生成":"转写完成"}</span>:<span className="text-xs font-semibold">准备处理</span>}</div>
          {!uploadedTranscript&&<div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"><div><label htmlFor="dashscope-key" className="mb-1.5 block text-xs font-semibold text-[#526e9b]">开发测试密钥（仅保留到本页关闭或刷新）</label><input id="dashscope-key" type="password" value={dashscopeKey} onChange={e=>setDashscopeKey(e.target.value)} placeholder="DashScope API Key" className="h-10 w-full rounded-xl border border-[#b8cbed] bg-white px-3 text-sm text-[#1c2d49] outline-none transition focus:border-[#155eef] focus:ring-2 focus:ring-[#155eef]/15"/>{transcribing&&processingStatus&&<p className="mt-2 text-xs font-semibold text-[#155eef]" aria-live="polite">{processingStatus}</p>}</div><Button className="self-end rounded-xl bg-[#155eef]" disabled={transcribing} onClick={transcribeFile}>{transcribing?<><LoaderCircle className="animate-spin"/> 处理中</>:<><Sparkles/> 开始AI转写</>}</Button></div>}
          {fileError&&<p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{fileError}</p>}
          {studyGuideWarning&&<p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">{studyGuideWarning}</p>}
          {uploadedTranscript&&<div className="mt-4 rounded-xl border border-[#c8d8f3] bg-white p-4"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#6d7d95]"><Sparkles className="size-3.5 text-[#155eef]"/> 上传录音识别结果</div><p className={`whitespace-pre-wrap text-[#1d2b45] ${subtitleTextClass}`}>{uploadedTranscript}</p>{language==="双语"&&translatedTranscript&&<p className={`mt-4 whitespace-pre-wrap border-t border-[#e2e9f3] pt-4 text-[#66758d] ${subtitleSize==="xlarge"?"text-lg leading-8":subtitleSize==="large"?"text-base leading-7":"text-sm leading-6"}`}>{translatedTranscript}</p>}</div>}
          {translationError&&<p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{translationError}</p>}
          <p className="mt-3 text-xs leading-5 text-[#6b7f9f]">{demoMode?"这是预置演示内容，用于快速体验产品流程；上传真实录音后将调用AI生成结果。":"支持最长 90 分钟、最大 120MB 的课堂录音。长音频会在浏览器中自动分段处理，无需手动剪辑；API Key仅随本次请求发送。"}</p>
        </section>}
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 text-sm text-[#60708a]"><span>{demoMode?"评审演示":uploadedTranscript?"我的课堂":"课堂工作台"}</span><ChevronRight className="size-3.5"/><span>{activeGuide?"AI学习指南":"等待内容"}</span></div><h1 className="text-2xl font-bold tracking-[-0.03em] text-[#15233f] sm:text-[1.9rem]">{displayTitle}</h1><p className="mt-2 text-sm text-[#64738a]">{demoMode?"无需准备文件或密钥 · 可体验问答与导出":uploadedTranscript?`${fileName} · 转写已完成`:fileName?`${fileName} · 等待转写`:"上传课堂录音，开始生成真实的学习内容"}</p></div><div className="flex flex-wrap gap-2"><Button variant={demoMode?"secondary":"outline"} className="rounded-xl bg-white" onClick={loadDemoClass}><Sparkles/> {demoMode?"示例已载入":"体验示例课堂"}</Button><Button variant="outline" className="rounded-xl bg-white" disabled={!uploadedTranscript||translating} onClick={toggleBilingual}>{translating?<LoaderCircle className="animate-spin"/>:<Globe2/>} {translating?"翻译中":language==="双语"?"仅中文":"生成双语字幕"}</Button><Button variant="outline" className="rounded-xl bg-white" disabled={!uploadedTranscript} onClick={exportStudyReport}><Download/> 导出学习报告</Button><Button variant={speech.recording?"outline":"default"} className={speech.recording?"rounded-xl border-red-200 bg-red-50 text-red-700 hover:bg-red-100":"rounded-xl bg-[#10213f] hover:bg-[#1b3157]"} onClick={speech.recording?speech.stop:speech.start}>{speech.recording?<><Square className="fill-current"/> 停止转写</>:<><Radio/> 开始实时课堂</>}</Button><Button className="rounded-xl bg-[#155eef]" onClick={()=>fileInput.current?.click()}><Upload/> 上传课堂文件</Button></div></div>
        {(speech.recording||speech.lines.length>0||speech.error)&&<section className="mb-5 overflow-hidden rounded-2xl border border-[#bdd0f4] bg-white shadow-[0_12px_28px_rgba(32,57,96,.07)]" aria-live="polite">
          <div className="flex items-center justify-between border-b border-[#e1e8f2] bg-[#f7faff] px-4 py-3 sm:px-5"><div className="flex items-center gap-3"><span className={`relative grid size-8 place-items-center rounded-full ${speech.recording?"bg-red-100 text-red-600":"bg-[#e8efff] text-[#155eef]"}`}><Mic2 className="size-4"/>{speech.recording&&<span className="absolute inset-0 animate-ping rounded-full bg-red-300/45"/>}</span><div><p className="text-sm font-bold">实时课堂转写</p><p className="text-xs text-[#6b7990]">{speech.recording?"正在聆听中文语音":"已停止，转写结果保留在本页"}</p></div></div><Button variant="ghost" size="sm" onClick={speech.reset}><RotateCcw/> 清空</Button></div>
          <div className="max-h-64 overflow-y-auto px-4 py-3 sm:px-5">{speech.error&&<p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">{speech.error}</p>}{speech.lines.length===0&&!speech.error&&<p className="py-5 text-center text-sm text-[#718096]">请对着麦克风说话，识别完成的句子会显示在这里。</p>}{speech.lines.map((line,index)=><div key={`${line.time}-${index}`} className="grid grid-cols-[48px_1fr] gap-3 border-b border-[#edf1f6] py-3 last:border-0"><span className="pt-0.5 text-xs font-semibold tabular-nums text-[#155eef]">{line.time}</span><p className={`text-[#1d2b45] ${subtitleTextClass}`}>{line.text}</p></div>)}{speech.interim&&<div className="grid grid-cols-[48px_1fr] gap-3 py-3"><span className="pt-1 text-xs font-semibold text-red-500">识别中</span><p className={`text-[#718096] ${subtitleTextClass}`}>{speech.interim}<span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[#155eef] align-middle"/></p></div>}</div>
          <div className="border-t border-[#e7edf5] px-4 py-2.5 text-xs leading-5 text-[#718096] sm:px-5">首次使用时请允许麦克风权限。实时识别效果取决于浏览器、网络和环境噪声。</div>
        </section>}
        <div className={`grid gap-5 ${focusMode?"":"xl:grid-cols-[minmax(0,1fr)_336px]"}`}>
          <div className="min-w-0">
            {!focusMode&&<section className="mb-5 overflow-hidden rounded-2xl border border-[#dce4ef] bg-[#10213f] text-white shadow-[0_16px_38px_rgba(32,57,96,.09)]"><audio ref={audioRef} src={audioUrl||undefined} onLoadedMetadata={event=>{setDuration(event.currentTarget.duration||0);event.currentTarget.volume=volume;event.currentTarget.muted=muted}} onTimeUpdate={event=>setCurrentTime(event.currentTarget.currentTime)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)}/><div className="relative flex h-[150px] items-end gap-[5px] px-5 pb-8 sm:px-7">{waveform.map((height,index)=>{const passed=duration>0&&index/(waveform.length-1)<=currentTime/duration;return <button key={index} disabled={!audioUrl} aria-label={`跳转到 ${Math.round(index/Math.max(1,waveform.length-1)*100)}%`} onClick={()=>seekAudio([duration*index/Math.max(1,waveform.length-1)])} className={`min-w-[2px] flex-1 rounded-full transition-colors ${passed?"bg-[#5ee0c5]":"bg-[#385071]"}`} style={{height:`${height}%`}}/>})}{!audioUrl&&<div className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-[#b8c8dc]">上传真实音频后，这里会显示音频波形并同步播放进度</div>}</div><div className="flex items-center gap-3 border-t border-white/10 bg-white/[.04] px-4 py-3 sm:px-6"><Button size="icon" className="size-10 rounded-full bg-[#5ee0c5] text-[#10213f] hover:bg-[#70ead1]" disabled={!audioUrl} onClick={togglePlayback} aria-label={playing?"暂停":"播放"}>{playing?<Pause/>:<Play className="translate-x-px"/>}</Button><span className="text-sm tabular-nums text-[#d8e4f5]">{formatTime(currentTime)}</span><Slider value={[currentTime]} min={0} max={duration||1} step={0.1} disabled={!audioUrl} onValueChange={seekAudio} aria-label="音频播放进度" className="flex-1 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-[#5ee0c5] [&_[data-slot=slider-thumb]]:border-[#5ee0c5]"/><span className="text-sm tabular-nums text-[#9fb1ca]">{formatTime(duration)}</span><div className="hidden items-center gap-2 sm:flex"><button type="button" disabled={!audioUrl} onClick={toggleMuted} aria-label={muted?"取消静音":"静音"} className="rounded-md p-1 text-[#b8c8dc] transition hover:bg-white/10 hover:text-white disabled:opacity-40">{muted||volume===0?<VolumeX className="size-4"/>:<Volume2 className="size-4"/>}</button><Slider value={[muted?0:volume]} min={0} max={1} step={0.05} disabled={!audioUrl} onValueChange={changeVolume} aria-label="音量" className="w-20 [&_[data-slot=slider-track]]:bg-white/15 [&_[data-slot=slider-range]]:bg-[#5ee0c5] [&_[data-slot=slider-thumb]]:border-[#5ee0c5]"/></div><button type="button" disabled={!audioUrl} onClick={toggleMuted} aria-label={muted?"取消静音":"静音"} className="rounded-md p-1 text-[#b8c8dc] sm:hidden">{muted||volume===0?<VolumeX className="size-4"/>:<Volume2 className="size-4"/>}</button></div></section>}
            <Tabs defaultValue="transcript" className="rounded-2xl border border-[#dce4ef] bg-white shadow-[0_12px_28px_rgba(32,57,96,.06)]"><div className="flex items-center justify-between border-b border-[#e3e9f1] px-4 pt-3 sm:px-6"><TabsList variant="line" className="h-11 gap-2 sm:gap-5"><TabsTrigger value="transcript"><Mic2/> <span className="hidden sm:inline">实时</span>转写</TabsTrigger><TabsTrigger value="notes"><BookOpenText/> 课堂笔记</TabsTrigger><TabsTrigger value="questions"><MessageCircleMore/> 提问记录</TabsTrigger></TabsList>{uploadedTranscript&&<span className="hidden rounded-full bg-[#e8f8f4] px-2.5 py-1 text-xs font-semibold text-[#15745f] sm:inline">转写已完成</span>}</div>
              <TabsContent value="transcript" className={`${focusMode?"max-h-none":"max-h-[455px]"} overflow-y-auto px-4 py-3 sm:px-6`}>{uploadedTranscript?<article className="py-5"><p className="mb-2 text-xs font-semibold text-[#66758d]">上传录音 · AI逐字稿</p><p className={`whitespace-pre-wrap text-[#1d2b45] ${subtitleTextClass}`}>{uploadedTranscript}</p>{language==="双语"&&translatedTranscript&&<div className="mt-5 rounded-xl border-l-4 border-[#5acdb7] bg-[#f4fbf9] px-4 py-3"><p className="mb-2 text-xs font-semibold uppercase tracking-[0.06em] text-[#39796c]">English translation</p><p className={`whitespace-pre-wrap text-[#52627a] ${subtitleSize==="xlarge"?"text-lg leading-8":subtitleSize==="large"?"text-base leading-7":"text-sm leading-6"}`}>{translatedTranscript}</p></div>}</article>:<div className="grid min-h-56 place-items-center py-10 text-center"><div><Mic2 className="mx-auto size-9 text-[#a8b5c8]"/><p className="mt-3 font-semibold text-[#43536d]">还没有课堂逐字稿</p><p className="mt-1 text-sm text-[#7a879a]">上传课堂录音并完成转写后，内容会显示在这里。</p></div></div>}</TabsContent>
              <TabsContent value="notes" className="p-4 sm:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">我的课堂笔记</h2><p className="mt-1 text-sm text-[#7a879a]">记录自己的理解、疑问和复习重点。</p></div><span className="rounded-full bg-[#edf3ff] px-2.5 py-1 text-xs font-semibold text-[#155eef]">{notes.length} 条</span></div><div className="mt-4 rounded-xl border border-[#dce4ef] bg-[#f8faff] p-3"><label htmlFor="note-draft" className="sr-only">新笔记</label><textarea id="note-draft" rows={3} value={noteDraft} onChange={event=>setNoteDraft(event.target.value)} placeholder="写下这节课的重要内容……" className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[#1d2b45] outline-none"/><div className="mt-2 flex justify-end"><Button size="sm" className="rounded-lg bg-[#155eef]" disabled={!noteDraft.trim()} onClick={addNote}><Plus/> 添加笔记</Button></div></div>{notes.length?<div className="mt-4 space-y-3">{notes.map(note=><article key={note.id} className="rounded-xl border border-[#e1e8f2] p-4">{editingNoteId===note.id?<><textarea rows={3} value={editingNoteText} onChange={event=>setEditingNoteText(event.target.value)} className="w-full resize-none rounded-lg border border-[#cbd8ea] px-3 py-2 text-sm leading-6 outline-none focus:border-[#155eef]"/><div className="mt-2 flex justify-end gap-2"><Button variant="ghost" size="sm" onClick={()=>setEditingNoteId(null)}>取消</Button><Button size="sm" disabled={!editingNoteText.trim()} onClick={saveEditedNote}>保存</Button></div></>:<><p className="whitespace-pre-wrap text-sm leading-7 text-[#34445f]">{note.content}</p><div className="mt-3 flex items-center justify-between gap-3"><span className="text-xs text-[#8a96a8]">{note.createdAt}</span><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={()=>beginEditNote(note)}>编辑</Button><Button variant="ghost" size="icon" aria-label="删除笔记" className="text-[#8794a8] hover:text-red-600" onClick={()=>removeNote(note.id)}><Trash2 className="size-4"/></Button></div></div></>}</article>)}</div>:<div className="mt-5 rounded-xl border border-dashed border-[#cbd8ea] px-4 py-10 text-center"><BookOpenText className="mx-auto size-9 text-[#a8b5c8]"/><p className="mt-3 font-semibold text-[#43536d]">还没有笔记，快来创建笔记吧。</p></div>}</TabsContent>
              <TabsContent value="questions" className="p-6">{qaHistory.length?<><h2 className="font-bold">课堂问答记录</h2><div className="mt-4 space-y-4">{qaHistory.map((item,index)=><article key={`${item.question}-${index}`} className="rounded-xl border border-[#e1e8f2] p-4"><p className="font-semibold text-[#1d2b45]">Q：{item.question}</p><p className="mt-2 text-sm leading-7 text-[#52627a]">{item.answer}</p>{item.citations.length>0&&<div className="mt-3 space-y-2">{item.citations.map(citation=><blockquote key={citation.quote} className="border-l-2 border-[#155eef] pl-3 text-sm leading-6 text-[#66758d]">“{citation.quote}”</blockquote>)}</div>}</article>)}</div></>:<div className="grid min-h-56 place-items-center text-center"><div><MessageCircleMore className="mx-auto size-9 text-[#a8b5c8]"/><p className="mt-3 font-semibold text-[#43536d]">还没有相关提问</p><p className="mt-1 text-sm text-[#7a879a]">在右侧向 AI 提问后，问答记录会保存在这里。</p></div></div>}</TabsContent>
            </Tabs>
          </div>
          <aside className={`${focusMode?"hidden":"space-y-5"}`}>
            <section className="rounded-2xl border border-[#dce4ef] bg-white p-5 shadow-[0_12px_28px_rgba(32,57,96,.06)]"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-lg bg-[#e8efff] text-[#155eef]"><Sparkles className="size-4"/></span><h2 className="font-bold">AI 课堂速览</h2></div>{activeGuide&&uploadedTranscript&&!demoMode&&<Button variant="ghost" size="sm" disabled={generatingGuide} onClick={generateStudyGuide}>{generatingGuide?<LoaderCircle className="animate-spin"/>:<RotateCcw/>} 重新生成</Button>}</div>{activeGuide?<><p className="mt-4 text-sm leading-6 text-[#516179]">{activeGuide.summary}</p><div className="mt-5 space-y-3">{activeGuide.keyPoints.map((item,index)=><div key={item} className="flex items-start gap-3 rounded-xl bg-[#f5f8fc] px-3 py-2.5 text-sm font-medium leading-6 text-[#34445f]"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-white text-xs font-bold text-[#155eef] shadow-sm">{index+1}</span>{item}</div>)}</div></>:<div className="mt-5 rounded-xl border border-dashed border-[#cbd8ea] px-4 py-7 text-center"><Sparkles className="mx-auto size-8 text-[#9caac0]"/><p className="mt-3 text-sm font-semibold text-[#43536d]">{uploadedTranscript?"逐字稿已就绪":"还没有课堂内容"}</p><p className="mt-1 text-xs leading-5 text-[#7a879a]">{uploadedTranscript?"让 AI 根据这节课生成摘要和核心知识点。":"完成课堂转写后即可生成真实速览。"}</p>{uploadedTranscript&&<Button size="sm" className="mt-4 rounded-lg bg-[#155eef]" disabled={generatingGuide} onClick={generateStudyGuide}>{generatingGuide?<><LoaderCircle className="animate-spin"/> 正在总结</>:<><Sparkles/> 生成课堂速览</>}</Button>}</div>}{studyGuideWarning&&<p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">{studyGuideWarning}</p>}</section>
            <section className="rounded-2xl bg-[#155eef] p-5 text-white shadow-[0_16px_34px_rgba(21,94,239,.22)]"><div className="flex items-center gap-2 font-bold"><MessageCircleMore className="size-5"/> 问问这节课</div><p className="mt-2 text-sm leading-6 text-blue-100">答案只依据已上传的逐字稿，并引用课堂原话。</p>{demoMode&&<div className="mt-3 flex flex-wrap gap-2">{["分类和回归有什么区别？","什么是过拟合？","老师布置了什么作业？"].map(item=><button key={item} onClick={()=>setQuestion(item)} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white transition hover:bg-white/20">{item}</button>)}</div>}<div className="mt-4 rounded-xl bg-white p-1.5 shadow-sm"><label htmlFor="question" className="sr-only">输入课堂问题</label><textarea id="question" rows={3} value={question} onChange={e=>setQuestion(e.target.value)} className="w-full resize-none rounded-lg px-3 py-2 text-sm text-[#1f2d46] outline-none" placeholder={demoMode?"点击上方示例问题，或输入关键词体验":uploadedTranscript?"例如：老师如何解释这个概念？":"请先上传一段课堂录音"}/><Button className="h-9 w-full rounded-lg bg-[#10213f] hover:bg-[#1b3157]" disabled={asking||!uploadedTranscript} onClick={askAboutClass}>{asking?<><LoaderCircle className="animate-spin"/> 正在查找原文</>:<>{demoMode?"演示回答":"提问并引用原文"} <ChevronRight/></>}</Button></div>{askError&&<p className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-sm leading-6 text-white">{askError}</p>}{qaHistory[0]&&<div className="mt-4 rounded-xl bg-white/10 p-3"><p className="text-xs font-semibold text-blue-100">最新回答</p><p className="mt-1 text-sm leading-6">{qaHistory[0].answer}</p>{qaHistory[0].citations[0]&&<blockquote className="mt-2 border-l-2 border-[#5ee0c5] pl-3 text-xs leading-5 text-blue-100">“{qaHistory[0].citations[0].quote}”</blockquote>}</div>}</section>
            <section className="rounded-2xl border border-[#dce4ef] bg-white p-5"><div className="flex items-center gap-2 font-bold"><ListChecks className="size-5 text-[#155eef]"/> 课后任务</div>{activeGuide?.tasks.length?<ul className="mt-3 space-y-2 text-sm leading-6 text-[#5d6c83]">{activeGuide.tasks.map(item=><li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 size-4 shrink-0 text-[#155eef]"/>{item}</li>)}</ul>:<p className="mt-3 text-sm leading-6 text-[#7a879a]">{activeGuide?"逐字稿中没有明确布置课后任务。":"生成课堂速览后，这里会显示识别出的课后任务。"}</p>}</section>
          </aside>
        </div>
      </section>
    </div>
  </main>;
}
