const { Configuration, OpenAIApi } = require("openai");
const fs = require("fs");
const csv = require('csv-parser');
const { stringify } = require("csv-stringify");

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

const sleep = (ms) =>
  new Promise(resolve => setTimeout(resolve, ms));

let categories = [
    ["Arts and Humanities", "Includes majors such as literature, philosophy, history, and visual and performing arts."],
    ["Social Sciences", "Includes majors like psychology, sociology, anthropology, political science, and international relations."],
    ["Business and Management", "Covers majors such as marketing, finance, economics, business administration, and accounting."],
    ["Life Sciences and Agriculture", "Encompasses biology, environmental sciences, animal sciences, agriculture, and related fields."],
    ["Physical Sciences", "Includes majors such as physics, chemistry, astronomy, and geology."],
    ["Mathematics Statistics and Computer Science", "Covers fields like applied mathematics, pure mathematics, statistics, computer science, and data science."],
    ["Engineering and Technology", "Encompasses electrical, mechanical, civil, aerospace engineering, and many other branches, plus fields like information technology and systems engineering."],
    ["Medicine Health and Allied Sciences", "Includes nursing, pre-med, medical school, and similar areas, along with related fields like pharmacy, dentistry, and public health."],
    ["Education and Teaching", "Encompasses fields like elementary education, higher education, educational leadership, curriculum development, and special education."],
    ["Communication and Media Studies", "Covers majors such as journalism, mass communication, media production, advertising, and public relations."],
    ["All Other Programs", "Anything that doesn't fit in the programs above."]
];

let mainPrompt = `The above information pertains to categories of undergraduate programs. Categorize the below data into one of the program categories above.  
Desired Format: CSV of response number, program number
`;

// This is how many data points will be processed in one request. We know anything over 80 is a problem.
let batchSize = 50;

//                   In file, column name, outfile, out col name, categories and main prompt
classifyCSVFileData('npi-data/small-samp.csv','Major','npi-data/small-samp-out.csv','Std Major')


async function classifyCSVFileData(fileName, srcCol, destFileName, targetCol) {
    // First we need to read the CSV file in
    const rows = [];
    // Create a parser for the CSV data
    fs.createReadStream(fileName)
    .pipe(csv())
    .on('data', (data) => rows.push(data))
    .on('end', async () => {
        let data = [];
        // We have read the file entirely. Now, lets convert
        for (const row of rows) {
           if (!row[targetCol])
              data.push(row[srcCol].trim());
        }
        dataMapping = await getClassificationMapping(data);
        console.log("-- Final Mapping is:\n");
        console.log(dataMapping);
        for (let row of rows) {
            srcVal = row[srcCol].trim();
            if (!row[targetCol] && dataMapping[srcVal])
                row[targetCol] = dataMapping[srcVal];
        }
        
        stringify(rows, {
            header: true
        }, function (err, output) {
            fs.writeFile(__dirname+'/'+destFileName, output,function(err, result) {
                if(err) console.log('error', err);
              });
        });
    });
    
}

async function getClassificationMapping(data) {
    // Return value
    let mappedData = {};
    
    // First build the prompt for categories with serialized numbers
    let categoriesText = "";
    
    for(index = 0; index < categories.length; ++index) {
        categoriesText += (index+1).toString() + ". " + categories[index][0] +": "+categories[index][1] + "\n";
    }
    
    // Next build the prompt for data with serialized numbers
    // We'll only process unique data values
    data.push('Other');
    let uniqueData = data.filter(onlyUnique);
    let totalDataPoints = uniqueData.length;

    let dataText = "Data:\n###\n";
    let requestCount = 1;

    for(index = 0; index < totalDataPoints; ++index) {
        dataText += (index+1).toString() + ". " + uniqueData[index] + "\n";
        requestCount++;
        if (requestCount>batchSize || index==totalDataPoints-1) {
            dataText += "###\n";
            let prompt = categoriesText + "\n" + mainPrompt + "\n" + dataText;

            console.log("-- The prompt is:\n");
            console.log(prompt);

            try {
                const response = await openai.createChatCompletion({
                model: "gpt-3.5-turbo",
                temperature: 0,
                messages: [
                    {"role": "system", "content": "You are a helpful assistant."},
                    {"role": "user", "content": prompt},
                ]
                });
                console.log("-- Response Data is:\n");
                console.log(JSON.stringify(response.data));
                let mapping = convertCSVStringToArray(response.data.choices[0].message.content);

                
                // Now construct the response array
                //console.log(mapping);
                for (index2=0; index2<mapping.length; ++index2) {
                    if (Array.isArray(mapping[index2]) && mapping[index2].length==2 && Array.isArray(categories[mapping[index2][1]-1])) {
                        //console.log((mapping[index2][0])+" topic is "+uniqueData[mapping[index2][0]-1]);
                        //console.log((mapping[index2][1])+" cat is   "+categories[mapping[index2][1]-1][0]+"\n");
                        
                        mappedData[uniqueData[mapping[index2][0]-1]] = categories[mapping[index2][1]-1][0];
                    }
                }
                //console.log("---Current Mappings are:\n");
                //console.log(mappedData);
                sleep(1000);
        
            } catch (error) {
                console.error('API Error:',error);
            }
            
            // Reset data
            dataText = "Data:\n###\n";
            requestCount = 1;
            
        }
    }
    // In case the field is empty, default to Other.
    mappedData[''] = mappedData['Other'];

    
    return mappedData;
}


function convertCSVStringToArray(csvString) {
  // Split the string by newline characters
  const lines = csvString.split('\n');

  // Create an array to store the values
  const array = [];

  // Iterate over the lines and split each line by commas
  for (const line of lines) {
    const values = line.split(',');
    const innerArray = [];
    for (const value of values) {
        if (!isNaN(value)) {
            innerArray.push(parseInt(value))
        } else {
            innerArray.push(value);
        }
    }
    // Add the values to the array
    array.push(innerArray);
  }

  // Return the array
  return array;
}

function onlyUnique(value, index, array) {
    return value &&  array.indexOf(value) === index;
}

