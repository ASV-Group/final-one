import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, User } from "lucide-react";

const InterviewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [duration, setDuration] = useState("");
  const [interviewer, setInterviewer] = useState("");

  const courseNames: { [key: string]: string } = {
    "1": "Software Engineering",
    "2": "Product Management",
    "3": "Behavioral Interviews",
    "4": "Business & Strategy"
  };

  const courseName = courseNames[id || "1"];

  const handleStart = () => {
    if (duration && interviewer) {
 navigate(`/interview/${id}/room`,{state:{selectedMinute:duration}});
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/interview")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-3xl text-foreground">{courseName}</CardTitle>
            <CardDescription className="text-base">
              Configure your interview session settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-accent" />
                Interview Duration
              </Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger id="duration">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minutes</SelectItem>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="interviewer" className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-accent" />
                Select Interviewer
              </Label>
              <Select value={interviewer} onValueChange={setInterviewer}>
                <SelectTrigger id="interviewer">
                  <SelectValue placeholder="Choose your interviewer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alex">Alex Chen - Senior Engineer at Google</SelectItem>
                  <SelectItem value="sarah">Sarah Johnson - Product Lead at Meta</SelectItem>
                  <SelectItem value="michael">Michael Brown - VP Engineering at Amazon</SelectItem>
                  <SelectItem value="emily">Emily Davis - Tech Lead at Microsoft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4">
              <Button 
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 text-lg py-6"
                onClick={handleStart}
                disabled={!duration || !interviewer}
              >
                Start Interview Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewDetail;
