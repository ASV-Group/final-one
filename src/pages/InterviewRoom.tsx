import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import { ScrollArea } from "@/components/ui/scroll-area";
import speechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { OpenRouter } from "@openrouter/sdk";
import { Bot, User } from "lucide-react";

// OpenRouter SDK initialization
const openrouter = new OpenRouter({
  apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
});

interface Message {
  role: "user" | "assistant";
  content: string;
}

const InterviewRoom = () => {
  const location = useLocation();
  const initialMinutes = location.state?.selectedMinute || 45;
  const navigate = useNavigate();

  // States
  const [notes, setNotes] = useState("");
  const [isMuted, setIsMuted] = useState(true);
  const [cnt_IsVideoOff, set_cntIsVideoOff] = useState(1);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [secondsRemaining, setSecondsRemaining] = useState(initialMinutes * 60);
  const [conversation, setConversation] = useState<Message[]>([
    { role: "assistant", content: "Hello! I'm your AI interviewer. Let's start!" },
  ]);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const loopRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);
  const feedbackRef = useRef({
    shoulder_level: 0,
    lookLeftCount: 0,
    lookRightCount: 0,
    sitStraight: 0,
    totalFrames: 0,
  });

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  // Timer formatting
  const formatTimer = (totalSeconds: number) => {
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min < 10 ? "0" + min : min}:${sec < 10 ? "0" + sec : sec}`;
  };
  const timeElapsed = formatTimer(secondsRemaining);

  // End interview
  const handleEndInterview = () => {
    if (loopRef.current) clearInterval(loopRef.current);
    navigate("/profile", { state: { feedback: feedbackRef.current } });
  };

  // Pose Detection
  useEffect(() => {
    const loadModel = async () => {
      await tf.ready();
      const detector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      });
      detectorRef.current = detector;
      console.log("AI model loaded");
      startAnalysisLoop();
    };

    const startAnalysisLoop = () => {
      loopRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4 && detectorRef.current) {
          const poses = await detectorRef.current.estimatePoses(videoRef.current);
          if (poses.length > 0 && poses[0].score > 0.5) {
            analysePosture(poses[0].keypoints);
          }
        }
      }, 100);
    };

    loadModel();
    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, []);

  const analysePosture = (keypoints: any) => {
    const nose = keypoints[0];
    const leftShoulder = keypoints[5];
    const rightShoulder = keypoints[6];
    const videoWidth = videoRef.current?.videoWidth || 1;

    feedbackRef.current.totalFrames++;
    const normalizedNoseX = nose.x / videoWidth;

    if (normalizedNoseX < 0.30) feedbackRef.current.lookLeftCount++;
    if (normalizedNoseX > 0.70) feedbackRef.current.lookRightCount++;

    const shoulderSlope = Math.abs(leftShoulder.y - rightShoulder.y);
    if (shoulderSlope > 20) feedbackRef.current.shoulder_level++;
    if (normalizedNoseX < 0.40 || normalizedNoseX > 0.60 || shoulderSlope > 20)
      feedbackRef.current.sitStraight++;
  };

  // Video handling
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    const startCamera = async () => {
      if (cnt_IsVideoOff % 2 !== 0) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          currentStream = stream;
          setIsVideoOff(false);
          setTimeout(() => {
            if (videoRef.current) videoRef.current.srcObject = stream;
          }, 100);
        } catch (err) {
          console.log("User denied camera permission");
          setIsVideoOff(true);
        }
      } else {
        if (currentStream) {
          currentStream.getVideoTracks().forEach((track) => track.stop());
          setIsVideoOff(true);
        }
      }
    };
    startCamera();
    return () => {
      if (currentStream) currentStream.getTracks().forEach((track) => track.stop());
    };
  }, [cnt_IsVideoOff]);

  // Timer countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (loopRef.current) clearInterval(loopRef.current);
          navigate("/profile", { state: { feedback: feedbackRef.current } });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Murf TTS
const speakMurf = (text: string) => {
  try {
    // Create a new utterance
    const utterance = new SpeechSynthesisUtterance(text);

    // Set voice, pitch, rate, etc.
    utterance.voice = speechSynthesis.getVoices().find(voice => voice.lang === "en-US");
    utterance.pitch = 1; // default is 1
    utterance.rate = 1;  // default is 1

    // Speak the text
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error("SpeechSynthesis error:", err);
  }
};



  // OpenRouter chat
const askAI = async (messages: Message[]) => {
  let fullResponse = "";

  try {
    const stream = await openrouter.chat.send({
      model: "x-ai/grok-4.1-fast",
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      streamOptions: { includeUsage: true },
    });

    // --- FIX: Append first assistant message placeholder only once ---
    setConversation((prev) => [
      ...prev,
      { role: "assistant", content: "" }, // placeholder that will update
    ]);

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;

      if (content) {
        fullResponse += content;

        // --- FIX: Update ONLY the assistant message, do NOT remove user message ---
        setConversation((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: fullResponse,
          };
          return updated;
        });
      }
    }

    return fullResponse;
  } catch (err) {
    console.error(err);
    return "Failed to reach OpenRouter.";
  }
};


  // Handle user input from mic
  const handleUserInput = async (userText: string) => {
  // Add user message
  setConversation((prev) => [...prev, { role: "user", content: userText }]);

  // Ask AI — this will also create the assistant placeholder and update it
  const assistantText = await askAI([
    ...conversation,
    { role: "user", content: userText }
  ]);

  // ❌ DO NOT add assistant message again here  
  // askAI() already updates the last assistant message

  speakMurf(assistantText);
};


  // Toggle mic
  const toggleMic = async () => {
    if (isMuted) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsMuted(false);
        speechRecognition.startListening({ continuous: true, language: "en-US" });
      } catch (err) {
        console.log("User denied microphone permission");
        setIsMuted(true);
      }
    } else {
      setIsMuted(true);
      speechRecognition.stopListening();
      if (transcript) {
        console.log("User said:", transcript);
        await handleUserInput(transcript);
      }
      resetTranscript();
    }
  };

  const handleSubmit = async () => {
  if (!notes.trim()) return;

  // Add user code message to conversation
  setConversation((prev) => [
    ...prev,
    { role: "user", content: `Here is my code:\n\n${notes}` },
  ]);

  // Ask AI to evaluate code — askAI will insert placeholder & stream the response
  await askAI([
    ...conversation,
    {
      role: "user",
      content: `Evaluate this code and tell if it's correct. 
If not, explain the problems and provide a more optimal solution.

CODE:\n${notes}`,
    },
  ]);
};


  

  return (
    <div className="h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Interview Session</h1>
            <p className="text-muted-foreground">Software Engineering Interview</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge className="bg-accent/10 text-accent border-accent/20 text-lg px-4 py-2">{timeElapsed}</Badge>
            <Button variant="destructive" onClick={handleEndInterview} className="gap-2">
              <PhoneOff className="h-4 w-4" />
              End Interview
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(100vh-160px)] gap-2">
          {/* Left Video Section */}
          <div className="w-1/4 flex flex-col gap-1">
            {/* Interviewer */}
            <Card className="border-border bg-card h-1/3">
              <CardContent className="p-4 h-full flex items-center justify-center relative">
                <Avatar className="h-32 w-32 border-4 border-accent">
                  <AvatarImage src="https://imgcdn.stablediffusionweb.com/2024/4/13/cda5e567-2966-41e6-b2af-314ed7837221.jpg" />
                  <AvatarFallback className="bg-accent text-accent-foreground text-4xl">AI</AvatarFallback>
                </Avatar>
                <div className="absolute bottom-1 left-2">
                  <Badge className="bg-primary text-primary-foreground">Interviewer</Badge>
                </div>
              </CardContent>
            </Card>

            {/* User */}
            <Card className="border-border bg-card h-1/3">
              <CardContent className="p-4 h-full flex items-center justify-center relative">
                {isVideoOff ? (
                  <div className="text-center space-y-2">
                    <VideoOff className="h-16 w-16 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Camera Off</p>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover rounded-lg transform scale-x-[-1]"
                  />
                )}
                <div className="absolute bottom-4 left-4">
                  <Badge className="bg-accent text-accent-foreground">You</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes + Conversation */}
          <Card className="w-full h-[95%] flex flex-col">
            <CardContent className="p-2 flex-1 flex flex-col">
              <div className="flex flex-row justify-between mb-2">
                <h3 className="text-lg font-semibold text-foreground">Code Editor</h3>
                <button className="w-16 h-8 bg-green-500 rounded-sm" onClick={handleSubmit}>Submit</button>
              </div>

              <div className="flex-1 flex flex-row gap-2">
                <Textarea
                  placeholder="Write your code here..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="flex-1 resize-none"
                />
              
                <ScrollArea className="flex-1  border border-gray-300 rounded-lg bg-white p-2">
                  <div className="overflow-y-auto">
                    {conversation.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {msg.role === "assistant" && (
                          <Avatar className="h-6 w-6 border-2 border-accent">
                            <AvatarFallback>
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={`max-w-[80%] rounded-lg p-2 ${
                            msg.role === "user" ? "bg-accent text-accent-foreground" : "bg-secondary"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </div>
                        {msg.role === "user" && (
                          <Avatar className="h-6 w-6 border-2 border-primary">
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mic + Video Controls */}
        <div className="flex justify-center gap-3 pt-2 border border-[e6e9ef] rounded-md bg-slate-600 relative bottom-10">
          <Button size="lg" variant={isMuted ? "destructive" : "secondary"} onClick={toggleMic} className="rounded-full h-14 w-14">
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {/* <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={() => set_cntIsVideoOff((prev) => prev + 1)}
            className="rounded-full h-14 w-14"
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
          </Button> */}
          <Button
            size="lg"
            variant={isVideoOff ? "destructive" : "secondary"}
            onClick={() => {
              set_cntIsVideoOff((prev) => prev + 1);
              setIsVideoOff((prev) => !prev); // important!
            }}
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
