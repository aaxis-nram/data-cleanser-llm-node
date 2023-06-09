const fs = require("fs");
const { Configuration, OpenAIApi } = require("openai");

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
  })
);

const questions = [
  {
    question: "What is your current major?",
    subcategories: ["Arts and Humanities", "Physical Sciences", "Mathematics, Statistics, and Computer Science", "Medicine, Health, and Allied Sciences", "Other"],
  },
  {
    question: "What are your pronouns?",
    subcategories: ["Male", "Female", "Other"],
  },
  {
    question: "On average, how many days before a test do you start studying?",
    subcategories: ["Studious", "Normal", "Procrastinator", "Other"],
  },
  {
    question: "What is the BIGGEST challenge you face when studying for exams?",
    subcategories: ["Memory", "No direction/lack of guidance", "Distraction","Lack of notes", "Difficulty", "Anxiety", "Other"],
  },
  {
    question: "Have you considered utilizing AI with studying? (I.E. ChatGPT, StudyFetch (generates Quizlet-type study sets with AI), Khan Academy",
    subcategories: ["Used AI", "Hasn't used AI", "Other"],
  },
  {
    question: "If so, how has AI helped the challenges you face in college?",
    subcategories: ["Research", "Studying", "Study Tools","Organization", "Simplifying", "Doesn't help", "Other"],
  },
  {
    question: "Do you wish that teachers would utilize AI to help students rather than ban it?",
    subcategories: ["Yes", "No"],
  },
  {
    question: "What study resources or tools do you currently pay for? How much do you pay?",
    subcategories: ["Tutoring(less than $20)", "Tutoring(above $20)", "Material Access Sites(less than $20)", "Material Access Sites(above $20)", "Textbook/study materials(less than $20)", "Textbook/study materials(above $20)", "Other"],
  },
];

async function processBatch(file, batchSize, callback) {
  let data = fs.readFileSync(file);
  let jsonData = JSON.parse(data);

  let index = 0;
  while (index < jsonData.length) {
    let batch = jsonData.slice(index, index + batchSize);
    console.log(batch);
    await callback(batch);
    //process.exit(1);
    index += batchSize;
  }
}

const newData = fs.existsSync("npi-data/newdataaaa.json")
  ? JSON.parse(fs.readFileSync("npi-data/newdataaaa.json"))
  : [];

// Entry point
processBatch("npi-data/survey-data-small.json", 2, async (batch) => {
  const categorizedBatch = await Promise.all(
    batch.map(async (row) => {
      const categorizedRow = {};
      for (const { question, subcategories } of questions) {
        const responseKey = question.toLowerCase().split(' ').join('_');
        const responses = row[responseKey];
        if (responses) {
          const categorizedResponses = await categorizeResponse(question, responses, subcategories);
          categorizedRow[responseKey] = categorizedResponses;
          //{
          //  responses: categorizedResponses
            //,
            //subcategories: subcategories,
          //};
        }
      }
      return {
        ...row,
        ...categorizedRow,
      };
    })
  );
  newData.push(...categorizedBatch);
  fs.writeFileSync("npi-data/newdataaaa.json", JSON.stringify(newData, null, 2));
});

async function categorizeResponse(question, responses, subcategories) {
  const payload = {
    model: "gpt-3.5-turbo",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a survey response classifier taking user response " 
                +"and converting it to the most likely subcategories provided",
      },
      {
        role: "assistant",
        content: `
        Question: ${question}
        Here are the possible subcategories: ${subcategories.join(', ')}. Please categorize the following response: 
        ###
        ${JSON.stringify(responses)}
        ###
        Desired Format: JSON with the key subcategory.
        Example: { "subcategory":"None"}
        `,
      },
    ],
  };
  console.log("---Payload---\n");
  console.log(payload);

  const response = await openai.createChatCompletion(payload);
  console.log(response.data.choices[0].message);
  let subcat;
  try {
    subcat = (JSON.parse(response.data.choices[0].message.content))['subcategory'];
  } catch (e) {
    console.log("Error in JSON Parse",e);
    subcat = 'None';
  }

  return (subcat);
}