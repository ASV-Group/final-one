import { useState,useEffect,useRef} from "react";
import { useNavigate,useLocation} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from '@tensorflow/tfjs-core';
// Register WebGL backend
import '@tensorflow/tfjs-backend-webgl';
// state for feedback messages;
const InterviewRoom = () => {
  const location=useLocation();
  const initialMinutes=location.state?.selectedMinute||45;
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const videoRef=useRef(null);
  const [secondsRemaining,setSecondsRemaining] = useState(initialMinutes*60);

  const feedbackRef=useRef({
  "shoulder_level":0,
  "lookLeftCount":0,
  "lookRightCount":0,
  "sitStraight":0,
  "totalFrames":0
});
const detectorRef=useRef(null);
const loopRef=useRef(null);
  const handleEndInterview = () => {
    if(loopRef.current) clearInterval(loopRef.current);
    navigate("/profile",{state:{
          "feedback":feedbackRef.current,
        }
      })
  };
  useEffect(()=>{
    const loadModel=async()=>{
    await tf.ready();
    const detectorconfig={
      "modelType":poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
    };
    const detector=await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet,detectorconfig);
    detectorRef.current=detector;
    console.log("AI model is loaded");
    startAnalysisLoop();
  }
  const startAnalysisLoop=()=>{
    loopRef.current=setInterval( async ()=>{
      if(videoRef.current&&videoRef.current.readyState===4&&detectorRef.current){
        const poses=await detectorRef.current.estimatePoses(videoRef.current);
        if(poses.length>0&&poses[0].score>0.5){
          analysePosture(poses[0].keypoints);
        }
      }
    },100)
  }
  loadModel();
  return ()=>{
    if(loopRef.current) clearInterval(loopRef.current);
  }
  },[]);
  useEffect(()=>{
    let currentStream=null;
    const startCamera= async ()=>{
      try{
        // Ask for user's permission.
        const stream=await navigator.mediaDevices.getUserMedia({
          video:true,
          audio:true
        });
        currentStream=stream;
        // if user allowed update isVideoOff variable.
        setIsVideoOff(false);
        setIsMuted(false);
        // Waiting for React to render the video component and connecting the stream to it.
        setTimeout(()=>{
          if(videoRef.current){
            videoRef.current.srcObject=stream;
          }
        },100)
      }catch(err){
        console.log("user dennied the permission");
        setIsVideoOff(true);
        setIsMuted(true)
      }
    }
    startCamera();
    // cleanup function
    // when the page unmounts the cleanup function will be automatically called and it turnoff the camera.
    return ()=>{
      if(currentStream){
        // turnoff the camera amd microphone.
        currentStream.getTracks().forEach(track=>track.stop());
      }
    }
  },[])
  useEffect(()=>{
    const setTimer=setInterval(()=>{
      setSecondsRemaining((prev)=>{
        if(prev<=1){
          clearInterval(setTimer);
          if(loopRef.current) clearInterval(loopRef.current);
           navigate("/profile",{state:{
          "feedback":feedbackRef.current,
        }
      })
          return 0;
        }
        return prev-1;
      })
    },1000)
    return ()=>{
      clearInterval(setTimer);
    }
  },[]);
  const formatTimer=(totalSeconds)=>{
    const min=Math.floor(totalSeconds/60);
    const sec=totalSeconds%60;
    return `${min<10?"0"+min:min}:${sec<10?"0"+sec:sec}`;
  }
  const timeElapsed=formatTimer(secondsRemaining);
  const analysePosture=(keypoints)=>{
    const nose=keypoints[0];
    const leftShoulder=keypoints[5];
    const rightShoulder=keypoints[6];
    const videoWidth=videoRef.current.videoWidth;
    if(videoWidth){
          feedbackRef.current.totalFrames++;
    // if(nose.x<200){
    //   feedbackRef.current.lookLeftCount++;
    // }
    // else if(nose.x>440){
    //   feedbackRef.current.lookRightCount++;
    // }
    const normalizedNoseX=nose.x/videoWidth;
    if(normalizedNoseX<0.30){
      feedbackRef.current.lookLeftCount++;
    }
    if(normalizedNoseX>0.70){
      feedbackRef.current.lookRightCount++;
    }
    const shoulderSlope=Math.abs(leftShoulder.y-rightShoulder.y);
    if(shoulderSlope>20){
      feedbackRef.current.shoulder_level++;
    }
    // const mid_shoulder=Math.abs(leftShoulder.x+rightShoulder.x)/2;
    // const nose_gap=Math.abs(nose.x-mid_shoulder);
    // if(nose_gap>20) feedbackRef.current.sitStraight++;
    if(normalizedNoseX<0.40||normalizedNoseX>0.60||shoulderSlope>20){
      feedbackRef.current.sitStraight++;
    }
    // const shoulderMidpointX = (leftShoulder.x + rightShoulder.x) / 2;
    // const normalizedBodyX = shoulderMidpointX / videoWidth;
    // if (normalizedBodyX < 0.40 || normalizedBodyX > 0.60) {
    //     feedbackRef.current.sitStraight++; 
    // }

    }
  }
  return (
    <div className="h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Interview Session
            </h1>
            <p className="text-muted-foreground">
              Software Engineering Interview
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant="secondary"
              className="bg-accent/10 text-accent border-accent/20 text-lg px-4 py-2"
            >
              {timeElapsed}
            </Badge>
            <Button
              variant="destructive"
              onClick={handleEndInterview}
              className="gap-2"
            >
              <PhoneOff className="h-4 w-4" />
              End Interview
            </Button>
          </div>
        </div>

        {/* Main Content */}
        {/* Main Content */}
        <div className="flex h-[calc(100vh-160px)]">
          {/* Left Side - Videos */}
          <div className="w-1/4 border border-[e6e9ef] h-[95%] rounded-md ">
            {/* Interviewer Video */}
            <Card className="border-border bg-card h-1/3  mb-1">
              <CardContent className="p-4 h-full">
                <div className="relative h-full bg-primary/10 rounded-lg overflow-hidden flex items-center justify-center">
                  <Avatar className="h-32 w-32 border-4 border-accent">
                    {/* <AvatarImage src="/placeholder.svg" /> */}
                    <AvatarFallback className="bg-accent text-accent-foreground text-4xl">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute bottom-1 left-2">
                    <Badge className="bg-primary text-primary-foreground">
                      Alex Chen
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User Video */}
            <Card className="border-border bg-card h-1/3">
              <CardContent className="p-4 h-full">
                <div className="relative h-full bg-primary/10 rounded-lg overflow-hidden flex items-center justify-center">
                  {isVideoOff ? (
                    <div className="text-center space-y-2">
                      <VideoOff className="h-16 w-16 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Camera Off
                      </p>
                    </div>
                  ) : (
                     <video 
                    ref={videoRef}      // connecting the html to typescript
                    autoPlay            // required to play without pressing a hit button
                    muted               // required to prevent echo
                    playsInline         // required for mobile
                    className="w-full h-full object-cover rounded-lg transform scale-x-[-1]" // scale-x-[-1] mirrors the video like a selfie cam
                    />
                  )}
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-accent text-accent-foreground">
                      You
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section - Full Height */}
          <Card className="w-full h-[95%]">
            <CardContent className="p-2 h-full flex flex-col relative">
              <div className="flex flex-row  m-0 p-0">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Interview Notes
                </h3>
                <button className=" w-16 h-8 bg-green-500 rounded-sm relative m-0 p-0 left-[77%]">
                  Submit
                </button>
              </div>
              <Textarea
                placeholder="Take notes during your interview..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="flex-1 resize-none"
              />
              <div className="mt-4 space-y-2">
                {/* <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
          <p className="text-sm font-medium text-accent">Current Question:</p>
          <p className="text-sm text-foreground mt-1">
            Tell me about a time when you had to work with a difficult team member.
          </p>
        </div> */}
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="flex justify-center gap-3 pt-2 border border-[e6e9ef] relative bottom-10 rounded-md m-0 pb-1 bg-slate-600">
          <Button
            size="lg"
            variant={isMuted ? "destructive" : "secondary"}
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full h-14 w-14"
          >
            {isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={() => setIsVideoOff(!isVideoOff)}
            className="rounded-full h-14 w-14"
          >
            {isVideoOff ? (
              <VideoOff className="h-5 w-5" />
            ) : (
              <Video className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InterviewRoom;
