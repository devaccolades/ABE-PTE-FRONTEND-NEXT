import { create } from "zustand";

export const useExamStore = create((set, get) => ({
  userName: "",
  mockTestId: null,
  currentStep: "exam", // simple linear exam for now
  questionIndex: 0,
  nextQuestion: null,
  sessionId: "",
  questionSection: "",
  questionTimer: 0,
  stopSignal: false,
  remainingTime: 0,
  startExam: false,
  baseUrl: "https://admin.abepte.accoladesweb.com/mocktest/",
  // baseUrl: "http://192.168.29.96:8000/mocktest/",
  answer: {
    session_id: "",
    question_name: "",
    answer: {},
    answer_audio: null,
  },
  phase: "prep",
  isStopSignalSent: false, // <-- NEW STATE VARIABLE

  setStartExam: (value) => set({ startExam: value }),
  // Set any top-level key of `answer`
  setStopSignal: (value) => set({ stopSignal: value }),
  // Inside your create() function
  // Replace the old setAnswerKey with these two
  setAnswerKey: (key, value) =>
    set((state) => ({
      answer: {
        ...state.answer,
        [key]: value, // Updates top-level: session_id, answer_audio, question_name
      },
    })),

  setNestedAnswer: (id, value) =>
    set((state) => ({
      answer: {
        ...state.answer,
        answer: {
          ...state.answer.answer,
          [id]: value, // Updates nested object for Fill-blanks/MCQs
        },
      },
    })),

  // Reset all fields (if needed)
  resetAnswer: () =>
    set(() => ({
      answer: {
        session_id: "",
        question_name: "",
        answer: {},
        answer_audio: "",
      },
    })),
  setQuestionSection: (section) => set({ questionSection: section }),
  setQuestionTimer: (time) => set({ questionTimer: time }),
  setRemainingTime: (time) => set({ remainingTime: time }),
  setUserName: (name) => set({ userName: name.trim() }),
  setPhase: (ph) => set({ phase: ph }),
  setMockTestId: (id) => set({ mockTestId: id }),
  addAnswer: (answer) => set({ answers: [...get().answers, answer] }),
  setNextQuestion: (question) => set({ nextQuestion: question }),
  // nextQuestion: () => set({ questionIndex: get().questionIndex + 1 }),
  setSessionId: (id) => set({ sessionId: id }),
  resetExam: () => set({ currentStep: "exam", questionIndex: 0, answers: [] }),
}));

// Simple client-side stubs for later API integration
export const apiClient = {
  async fetchExam() {
    // placeholder structure for demo
    return {
      sections: [
        {
          id: "main",
          questions: [
            // {
            //   id: "speakingNotification",
            //   type: "notification",
            //   message:
            //     "The following section contains speaking tasks. Please ensure your microphone is connected and functioning properly.",
            //   durationSeconds: 5,
            // },
            // {
            //   id: "readAloutCaterogy",
            //   type: "category",
            //   categoryName: "read-aloud",
            //   message:
            //     "You will see a text on the screen. Read the text aloud as naturally and clearly as possible. You will have 35 seconds to prepare. The microphone opens automatically — begin speaking after the tone. You will only have one chance to record your response. Your response will be scored on pronunciation, fluency, and content accuracy.",
            //   durationSeconds: 5,
            // },
            // {
            //   id: "read-aloud-1",
            //   type: "read-aloud",
            //   notification:
            //     "Look at the text below, in 35 seconds, you must read this text aloud as naturally and clearly as possible. You have 35 seconds to read aloud.",
            //   prompt:
            //     "Technology has significantly transformed the way we live and communicate. From smartphones to artificial intelligence, modern tools have improved efficiency and convenience. However, while technology connects people globally, it also raises concerns about privacy, screen addiction, and social isolation. Striking a balance between innovation and human well-being is now more important than ever.",
            //   prepSeconds: 5,
            //   recordSeconds: 5,
            // },
            // {
            //   id: "read-aloud-2",
            //   type: "read-aloud",
            //   prompt:
            //     "Climate change is one of the most urgent challenges facing the world today. Rising temperatures, melting glaciers, and frequent natural disasters are clear signs of a changing climate. Scientists emphasize the need for global cooperation to reduce greenhouse gas emissions and shift toward renewable energy sources. Immediate action is crucial to protect the planet for future generations.",
            //   prepSeconds: 35,
            //   recordSeconds: 60,
            // },
            // {
            //   id: "read-aloud-3",
            //   type: "read-aloud",
            //   prompt:
            //     "Reading plays a crucial role in developing language skills, critical thinking, and imagination. Whether it is fiction or non-fiction, reading expands vocabulary and helps people understand different perspectives. In a digital age where visual media dominates, encouraging regular reading habits is essential for intellectual growth and lifelong learning.",
            //   prepSeconds: 35,
            //   recordSeconds: 60,
            // },
            // {
            //   id: "read-aloud-4",
            //   type: "read-aloud",
            //   prompt:
            //     "Urbanization refers to the increasing number of people living in cities. While it leads to economic development and better access to services, rapid urban growth can also result in overcrowding, pollution, and strain on infrastructure. City planners must focus on sustainable development to ensure livable and inclusive urban environments.",
            //   prepSeconds: 35,
            //   recordSeconds: 60,
            // },
            // {
            //   id: "read-aloud-5",
            //   type: "read-aloud",
            //   prompt:
            //     "Education is the foundation of personal and societal progress. It empowers individuals with knowledge, skills, and values that shape responsible citizens. Beyond academic learning, education also promotes critical thinking and creativity. As the world evolves, adapting education systems to meet new challenges is essential for building a better future.",
            //   prepSeconds: 35,
            //   recordSeconds: 60,
            // },
            // {
            //   id: "read-aloud-6",
            //   type: "read-aloud",
            //   prompt:
            //     "Regular physical exercise offers numerous health benefits. It strengthens the heart, improves mental well-being, and helps maintain a healthy weight. In addition, exercise boosts energy levels and enhances sleep quality. Even moderate daily activity, such as walking or stretching, can contribute significantly to a person's overall health and longevity.",
            //   prepSeconds: 35,
            //   recordSeconds: 60,
            // },
            // {
            //   id: "repeatsentenceCaterogy",
            //   type: "category",
            //   categoryName: "Repeat-Sentence",
            //   message:
            //     "Look at the upcoming texts. For each one, read it aloud within the allocated time as naturally and clearly as possible.",
            //   durationSeconds: 10,
            // },
            // {
            //   id: "Repeat-Sentence-1",
            //   type: "Repeat-Sentence",
            //   notification:
            //     "You will hear a sentence. Please repeat the sentence exactly as you hear it. you will hear the sentence only once.",
            //   audioUrl: "/retell-lecture/01.mp3",
            //   prepSeconds: 7,
            //   recordSeconds: 15,
            // },
            // {
            //   id: "retell-lecture-2",
            //   type: "retell-lecture",
            //   audioUrl: "/retell-lecture/02.mp3",
            //   prepSeconds: 10,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "retell-lecture-3",
            //   type: "retell-lecture",
            //   audioUrl: "/retell-lecture/03.mp3",
            //   prepSeconds: 10,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "retell-lecture-4",
            //   type: "retell-lecture",
            //   audioUrl: "/retell-lecture/04.mp3",
            //   prepSeconds: 10,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "retell-lecture-5",
            //   type: "retell-lecture",
            //   audioUrl: "/retell-lecture/05.mp3",
            //   prepSeconds: 10,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "retell-lecture-6",
            //   type: "retell-lecture",
            //   audioUrl: "/retell-lecture/06.mp3",
            //   prepSeconds: 10,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "retell-lecture-7",
            //   type: "retell-lecture",
            //   audioUrl: "/retell-lecture/07.mp3",
            //   prepSeconds: 10,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "DescribeImageCaterogy",
            //   type: "category",
            //   categoryName: "Describe-Image",
            //   message:
            //     "You will see an image. You will have 25 seconds to describe the image in detail. Please speak clearly and include as many details as possible.",
            //   durationSeconds: 5,
            // },
            // {
            //   id: "describe-image-1",
            //   type: "describe-image",
            //   notification:
            //     "Look at the image below. In 25 seconds, please speak into the microphone and describe in details what the image is showing. You will have 40 seconds to give your resonse.",
            //   imageUrl: "/describeImage/di1.png", // place this in public/images/
            //   prepSeconds: 25,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "describe-image-2",
            //   type: "describe-image",
            //   imageUrl: "/describeImage/di2.jpeg", // place this in public/images/
            //   prepSeconds: 30,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "describe-image-3",
            //   type: "describe-image",
            //   imageUrl: "/describeImage/di3.jpg", // place this in public/images/
            //   prepSeconds: 30,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "describe-image-4",
            //   type: "describe-image",
            //   imageUrl: "/describeImage/di4.png", // place this in public/images/
            //   prepSeconds: 30,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "describe-image-5",
            //   type: "describe-image",
            //   imageUrl: "/describeImage/di5.png", // place this in public/images/
            //   prepSeconds: 30,
            //   recordSeconds: 40,
            // },

            // category
            // {
            //   id: "DescribeImageCaterogy",
            //   type: "category",
            //   categoryName: "Write an Essay",
            //   message:
            //     "You will see an image. You will have 25 seconds to describe the image in detail. Please speak clearly and include as many details as possible.",
            //   durationSeconds: 5,
            // },
            // {
            //   id: "Respond-to-a-Situation-1",
            //   type: "Respond-to-a-Situation",
            //   notification:
            //     "Listen to and read a description of a situation. You will have 20 seconds to think about your answer. Then you will hear a beep. You will have 40 seconds to answer the question. Please answer as completely as you can.",
            //   audioSum:
            //     "You are attending a live performance, and the person sitting next to you is talking loudly, disrupting your enjoyment of the show. How would you handle this situation politely?",
            //   audioUrl: "/retell-lecture/01.mp3",
            //   prepSeconds: 7,
            //   recordPrep: 20,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "Answer-Short-Question-1",
            //   type: "Answer-Short-Question",
            //   notification:
            //     "You will hear a question. Please give a simple and short answer. Often just one or a few words is enough.",
            //   audioUrl: "/retell-lecture/01.mp3",
            //   prepSeconds: 7,
            //   recordSeconds: 40,
            // },
            // {
            //   id: "Summarize-Written-Text-1",
            //   type: "Summarize-Written-Text",
            //   notification:
            //     "Read the passage below. Summarize the passage using between 25 and 50 words. Type your response in the box at the bottom of the screen. You have 10 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points in the passage.",
            //   prompt: [
            //     "Although electric cars were clean, quiet ,and simple to operate, the drawback then, as now, was their limited range and long charging time. After 1915, they fell out of vogue as cars powered by internal-combustion engines and fueled with cheap gas oline gained favor.",
            //     "As concerns in recent years have grown about global warming caused by carbon-dioxide emissions, scientists have begun to reconsider electricity as a fuel for vehicles. But today's drivers (U.S.consumers, basedonthearticle's U.S.-centered context) expect a vehicle that is fuel efficient, and a fuel that is readily available in numerous locations and allows instant refueling.",
            //     "Although electric cars are fairly efficient, they require frequent refueling, and the process is far from instantaneous. They are expensive, too, since normal use causes their US$2,000 lead-acid batteries to wear out in just a few years. And, ironically, electric cars do very little to reduce carbon dioxide emissions, because, most U.S. electricity is generated by burning coal and other fossil fuels.",
            //     "To gain U.S. consumer acceptance, the car of the future will need to balance the benefits of electric cars wit hU.S. consumers' demands for distance and dynamo. The hybrid electric vehicle holds promise as asolution to both these needs.",
            //   ],
            //   durationSeconds: 600,
            // },
            // {
            //   id: "write-essay-1",
            //   type: "write-essay",
            //   notification:
            //     "Read the passage below. Summarize the passage using between 25 and 50 words. Type your response in the box at the bottom of the screen. You have 10 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points in the passage.",
            //   prompt: [
            //     "Although electric cars were clean, quiet ,and simple to operate, the drawback then, as now, was their limited range and long charging time. After 1915, they fell out of vogue as cars powered by internal-combustion engines and fueled with cheap gas oline gained favor.",
            //     "As concerns in recent years have grown about global warming caused by carbon-dioxide emissions, scientists have begun to reconsider electricity as a fuel for vehicles. But today's drivers (U.S.consumers, basedonthearticle's U.S.-centered context) expect a vehicle that is fuel efficient, and a fuel that is readily available in numerous locations and allows instant refueling.",
            //     "Although electric cars are fairly efficient, they require frequent refueling, and the process is far from instantaneous. They are expensive, too, since normal use causes their US$2,000 lead-acid batteries to wear out in just a few years. And, ironically, electric cars do very little to reduce carbon dioxide emissions, because, most U.S. electricity is generated by burning coal and other fossil fuels.",
            //     "To gain U.S. consumer acceptance, the car of the future will need to balance the benefits of electric cars wit hU.S. consumers' demands for distance and dynamo. The hybrid electric vehicle holds promise as asolution to both these needs.",
            //   ],
            //   durationSeconds: 600,
            // },
            {
              id: "fill-blanks-1",
              type: "fill-blanks-dropdown",
              notification:
                "Below is a text with blanks. Click on each blank, a list of choices will appear. Select the appropriate answer choice for each blank.",
              segments: [
                "The capital of France is ",
                ", the currency is ",
                ". The largest ocean is ",
                ", and the tallest mountain is ",
                ".",
              ],
              blanks: [
                { id: "b1", options: ["Paris", "Berlin", "Rome", "Madrid"] },
                { id: "b2", options: ["Euro", "Dollar", "Yen", "Pound"] },
                {
                  id: "b3",
                  options: ["Pacific", "Atlantic", "Indian", "Arctic"],
                },
                {
                  id: "b4",
                  options: ["Everest", "K2", "Kangchenjunga", "Lhotse"],
                },
              ],
              durationSeconds: 45,
            },
            {
              id: "mcq-multi-1",
              type: "mcq-multi",
              notification:
                "Read the passage carefully and answer the question by selecting all the correct options. More than one option may be correct.",
              paragraphs: [
                "The Internet has revolutionized the way people communicate and access information. Originating from a military project in the late 1960s called ARPANET, it was initially designed to create a robust and fault-tolerant communication network. Over time, the Internet expanded beyond military and academic use to become a global platform accessible to billions. The introduction of the World Wide Web in the early 1990s transformed the Internet from a text-based communication tool to a multimedia experience. Today, it supports a wide variety of services, including email, social media, online banking, and streaming. The rapid development of Internet technologies continues to influence economic, social, and cultural aspects worldwide, although it also presents challenges such as privacy concerns, cyber security threats, and digital divides.",
              ],
              questionText: "Which of the following statements are true?",
              options: [
                "The Internet started as a military project.",
                "The World Wide Web was introduced before ARPANET.",
                "The Internet only supports text-based communication.",
                "The Internet provides services like online banking and social media.",
                "Privacy concerns and cyber security are challenges related to the Internet.",
                "The Internet is only used by academics.",
              ],
              durationSeconds: 40,
            },
            {
              id: "reorder-1",
              type: "reorder-paragraphs",
              notification:
                "You will be given several paragraphs in jumbled order. Drag and drop the paragraphs to arrange them in a logical, coherent sequence.",
              items: [
                {
                  id: "p1",
                  label: "a",
                  text: "Many people enjoy traveling because it broadens their horizons and exposes them to different cultures.",
                },
                {
                  id: "p2",
                  label: "b",
                  text: "Traveling requires planning, including booking tickets and accommodations.",
                },
                {
                  id: "p3",
                  label: "c",
                  text: "Before traveling, it is important to pack necessary items for the trip.",
                },
                {
                  id: "p4",
                  label: "d",
                  text: "Once at the destination, travelers can explore famous landmarks and try local cuisine.",
                },
              ],
              durationSeconds: 500,
            },
            {
              id: "fill-in-the-blanks-drag",
              type: "fill-in-the-blanks-drag-and-drop",
              notification:
                "A text appears on the screen with several gaps. Drag words from the box below to fill each gap in the text. You can only use each word once.",
              segments: [
                "Improving workplace productivity requires more than just hard work. Employers need to create an environment that encourages motivation and",
                ". Flexible working hours, regular breaks, and a positive atmosphere can",
                "employee satisfaction. On the other hand, poor management and lack of recognition often",
                "performance and lead to high staff turnover.",
              ],
              blanks: [
                "support",
                " increase",
                "reduce",
                "affect",
                "communication",
                "inspire",
              ],
            },
            {
              id: "Multiple-Choice-Single-Answer",
              type: "mcq-single",
              notification:
                "Read the text and answer the multiple-choice question by selecting the correct response. Only one response is correct.",
              paragraphs: [
                "In the earliest stages of man’s development, he had no need of money. He was content with very simple forms of shelter, making his own rough tools and weapons, and he could provide food and clothing for himself and his family from natural materials around him. As he became more civilized, however, he began to want better shelter, more efficient tools and weapons, and more comfortable and more lasting clothing than those that could be provided by the work of his own unskilled hands. For these things, he had to turn to skilled people such as smiths, leather workers, or carpenters. It was then that the question of payment arose.",
              ],
              questionText: ["What can we infer from this passage?"],
              options: [
                "People create money for more efficient tools and weapons.",
                "There is a little need of money in the earliest stage.",
                "Previous people can make advanced tools by themselves.",
                "Money is related to civilization.",
              ],
              durationSeconds: 60,
            },
            {
              id: "essay-1",
              type: "audio-to-text",
              notification:
                "You will hear a short lecture. Write a summary for a fellow student who was not present at the lecture. You should write 50 - 70 words. You have 10 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points presented in the lecture.",
              output: "/summerize-text/Summarise1.mp3",
              prepSeconds: 5,
              durationSeconds: 60,
            },
            {
              id: "mcq-1",
              type: "audio-to-mcq",
              output: "/summerize-text/Summarise1.mp3",
              notification:
                "Listen to the recording and answer the question by selecting all the correct responses. You will need to select more than one response.",
              prepSeconds: 5,
              prompt:
                "Which of the following conditions need to be met by parents who want to have their children educated at home?",
              options: [
                {
                  id: "o1",
                  text: "Scientists still do not know why music probably helps language learning.",
                },
                {
                  id: "o2",
                  text: "Piano lessons can heighten the brain's response to changes in pitch.",
                },
                {
                  id: "o3",
                  text: "Children who have attended kindergarten are more interested in music.",
                },
                {
                  id: "o4",
                  text: "Mandarin is a tonal language, which is different from English.",
                },
                {
                  id: "o5",
                  text: "Music lessons only benefit language learners who learn tonal languages.",
                },
              ],
              durationSeconds: 60,
            },
            {
              id: "fill-in-the-blanks-typable",
              type: "fill-in-the-blanks-typable",
              output: "/summerize-text/Summarise1.mp3",
              notification:
                "You will hear a recording. Type the missing words in each blank.",
              prepSeconds: 5,
              segments: [
                "Local farmers ",
                "  experiment with new methods to grow their crops more efficiently. They want to improve their harvests each season. Different ",
                " of plant cells, where chlorophyll captures sunlight. During photosynthesis, carbon dioxide and water are transformed into glucose and oxygen. The glucose produced serves as a vital energy source for plants, while the oxygen is released into the atmosphere, benefiting all aerobic organisms.",
                " types of farming, such as organic or vertical farming, are becoming popular. Many ",
                " now offer subscription services to deliver their produce directly to customers. They pack ",
                " vegetables into a  ",
                " for families to enjoy weekly. This ensures people have access to healthy food.",
              ],
              durationSeconds: 20,
            },
            {
              id: "mcq-radio",
              type: "audio-to-mcq-radio",
              output: "/summerize-text/Summarise1.mp3",
              notification:
                "Listen to the recording and answer the question by selecting all the correct responses. You will need to select more than one response.",
              prepSeconds: 5,
              prompt:
                "You will hear a short lecture. Write a summary for a fellow student who was not present at the lecture. You should write 20 - 30 words. You have 8 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points presented in the lecture.",
              options: [
                {
                  id: "o1",
                  text: "Scientists still do not know why music probably helps language learning.",
                },
                {
                  id: "o2",
                  text: "Piano lessons can heighten the brain's response to changes in pitch.",
                },
                {
                  id: "o3",
                  text: "Children who have attended kindergarten are more interested in music.",
                },
                {
                  id: "o4",
                  text: "Mandarin is a tonal language, which is different from English.",
                },
                {
                  id: "o5",
                  text: "Music lessons only benefit language learners who learn tonal languages.",
                },
              ],
              durationSeconds: 60,
            },
            {
              id: "Select-Missing-Word-1",
              type: "audio-to-mcq-radio",
              notification:
                "Listen to the recording and answer the question by selecting all the correct responses. You will need to select more than one response.",
              prepSeconds: 5,
              output: "/summerize-text/Summarise1.mp3",
              prompt:
                "You will hear a short lecture. Write a summary for a fellow student who was not present at the lecture. You should write 20 - 30 words. You have 8 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points presented in the lecture.",
              options: [
                {
                  id: "o1",
                  text: "Calming",
                },
                {
                  id: "o2",
                  text: "Illusory",
                },
                {
                  id: "o3",
                  text: "Disturbing",
                },
                {
                  id: "o4",
                  text: "inaudible",
                },
              ],
              durationSeconds: 60,
            },
            {
              id: "highlight-incorrect-words",
              type: "highlight-incorrect-words",
              prepSeconds: 5,

              notification:
                "You will hear a recording. Below is the transcription of the recording. Some words in the transcription differ from what the speaker says. Click on the words that are different. There is no negative marking, so choose carefully.",
              output: "/summerize-text/Summarise1.mp3",
              prompt:
                "By now, you've probably heard of Expelled, the new Ben Stein anti-evolution documentary. It officially opens today as I speak, that's April 18th. Because of my job, I've had the cloven of sitting through this film twice now. At least I was getting paid. The film tries very hard to connect Darwin with the Holocaust. Toward the end, Ben Stein reads the following quote from the book Descent of Man: 'With savages, the weak in body or mind are soon eliminated. We organized men, on the other hand, do our utmost to check the process of elimination. We build asylums for the imbecile, the maimed and the sick. Thus the weak members of civilized societies propagate their kind. No one who has attended to the expanding of domestic animals will doubt that this must be highly injurious to the race of man. Hardly anyone is so ignorant as to allow his worst animals to breed.'",
            },
            {
              id: "Write-from-Dictation-1",
              type: "Write-from-Dictation",
              notification:
                "You will hear a short lecture. Write a summary for a fellow student who was not present at the lecture. You should write 50 - 70 words. You have 10 minutes to finish this task. Your response will be judged on the quality of your writing and on how well your response presents the key points presented in the lecture.",
              output: "/summerize-text/Summarise1.mp3",
              prepSeconds: 5,
              durationSeconds: 60,
            },
          ],
        },
      ],
    };
  },
  async submitAnswer(_payload) {
    // noop: wire to backend later
    return { ok: true };
  },
};
