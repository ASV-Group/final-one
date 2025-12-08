// import React,{useEffect,useRef} from "react";
// import p5 from "p5";
// import * as poseDetection from "tensorflow-models/pose-detection";
// import * as tf from "@tensorflow/tfjs-core";
// import "@tensorflow/tfjs-backend-webgl";
// const PostureAnalysis=({feedbackRef})=>{
//     const renderRef=useRef(null);
//     useEffect(()=>{
//         const sketch=(p)=>{
//             let lastAnalysisTime=0;const interval=100;
//             // video capture stream (webcam)
// let capture = null;

// // pose detector object
// let detector = null;

// // boolean to check if model is loaded or not
// let isModelLoaded = false;

// // stores pose data array (MoveNet returns poses array)
// let poses = [];

// // store previous nose position to check left/right movement
// let prevNoseX = null;
// let lookAwayCounter = 0;

// // ============================ MODEL INITIALIZATION ======================================
// const initialize_model=async ()=>{
//   // model configuration for MoveNet Lightning (fast model)
//   const detectorConfig = {
//     modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
//   };

//   try {
//     // create pose detector
//     detector = await poseDetection.createDetector(
//       poseDetection.SupportedModels.MoveNet,
//       detectorConfig
//     );
//     isModelLoaded = true;
//     console.log("Model Loaded Successfully");

//     // start pose detection loop
//     // getPoses();
//   } catch (err) {
//     console.log("Error while loading model: ", err);
//   }
// }

// // ============================ P5 SETUP FUNCTION ===================================
// const setup=()=>{
//   let canvas=p.createCanvas(640, 480); // canvas for drawing
//   cnv.parent(renderRef.current);
//    capture = p.createCapture(VIDEO); // access webcam
//   capture.size(640, 480); // set size
//   capture.hide(); // hide default video feed (we draw manually on canvas)
//   initialize_model(); // load MoveNet
// }
// const draw=()=>{
//     background(200); // background color
//   image(capture, 0, 0, 640, 480); // draw webcam feed

//   if (poses.length > 0 && poses[0].score > 0.5) {
//     // check if pose detected
//     let keypoints = poses[0].keypoints;

//     // draw each body key point
//     for (let i = 0; i < keypoints.length; ++i) {
//       if (keypoints[i].score > 0.5) {
//         fill(255, 0, 0);
//         ellipse(keypoints[i].x, keypoints[i].y, 10, 10);
//       }
//     }
//     if(p.millis()-lastAnalysisTime>interval){
//         analyseposture();
//     }
// }
// }

// const analyseposture=async ()=>{
//     try{
//         // only estimate pose if webcam is initialized
//     if (detector && capture.elt.readyState >= 2) {
//       poses = await detector.estimatePoses(capture.elt);
//     }
//     if(poses.length>0&&poses[0].score>0.5){
//         let keypoints=poses[0].keypoints;
//         /* ************* third change ********************/
//     // ---------------- Eye Contact / Cheating Detection -------------------
//     let nose = keypoints.find((k) => k.name === "nose");
//     let leftEye = keypoints.find((k) => k.name === "left_eye");
//     let rightEye = keypoints.find((k) => k.name === "right_eye");
//      if (window.noseHistory.length > 5) window.noseHistory.shift(); // keep last 5 only

//       // compute smoothed average nose position
//       let smoothedNoseX =
//         window.noseHistory.reduce((a, b) => a + b, 0) /
//         window.noseHistory.length;

//       // dynamic threshold using face width (eye distance)
//       let faceWidth = Math.abs(rightEye.x - leftEye.x);
//       let threshold = faceWidth * 0.12; // 12% of face width

//       let diff = nose.x - smoothedNoseX;

//       if (Math.abs(diff) > threshold) {
//         lookAwayCounter++;
//       } else {
//         lookAwayCounter = Math.max(lookAwayCounter - 1, 0); // slow reset
//       }

//       // if count exceeds limit → alert
//       if (lookAwayCounter > 2) {
//         // about 0.3 sec at ~50fps
//         console.log("⚠ MAKE EYE CONTACT ‼ STOP LOOKING SIDEWAYS!");
//         lookAwayCounter = 0;
//       }
//     }
//     // ---------------- Wrong Posture Detection ----------------------
//     let leftShoulder = keypoints.find((k) => k.name === "left_shoulder");
//     let rightShoulder = keypoints.find((k) => k.name === "right_shoulder");

//     if (nose && leftShoulder && rightShoulder) {
//       // average shoulder height
//       let shoulderY = (leftShoulder.y + rightShoulder.y) / 2;

//       // if nose is too close to shoulder level → bending detected
//       if (shoulderY - nose.y < 110) {
//         console.log("⚠ WRONG POSTURE ‼ SIT STRAIGHT");
//       }
//     }
//     }catch(err){
//         console.log("error in pose detection",err);
//     }
//     }
//     }
// }
//         }
//     },[])
// }