import React, { useState } from "react";
import PTEReadinessCheck from "./PTEReadinessCheck";
import MicCheck from "./MicCheck";
import PersonalIntroduction from "./PersonalIntroduction";
import AudioSoftStart from "./AudioSoftStart";
import PTESectionNotification from "./PTESectionNotification";
import { useExamStore } from "@/store";

const PreExam = () => {
  const FLOW = {
    INTRO: "intro",
    AUDIOCHECK: "audiocheck",
    // SELFINTRO: "selfintro",
    SELFINTRORECORDING: "selfintrorecording",
    NOTIFICATION: "notification",
  };

  const [flow, setFlow] = useState(FLOW.INTRO);
  const setExamStarted = useExamStore((s) => s.setStartExam);
  //   return (
  switch (flow) {
    case FLOW.INTRO:
      return <PTEReadinessCheck onProceed={() => setFlow(FLOW.AUDIOCHECK)} />;

    case FLOW.AUDIOCHECK:
      return <MicCheck onFinished={() => setFlow(FLOW.SELFINTRORECORDING)} />;

    // case FLOW.SELFINTRO:
    //   return (
    //     <PersonalIntroduction
    //       onComplete={() => setFlow(FLOW.SELFINTRORECORDING)}
    //     />
    //   );

    case FLOW.SELFINTRORECORDING:
      return <AudioSoftStart onNext={() => setFlow(FLOW.NOTIFICATION)} />;
    case FLOW.NOTIFICATION:
      return <PTESectionNotification onBegin={() => setExamStarted(true)} />;

    default:
      break;
  }
  //   )
};

export default PreExam;
