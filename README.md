# node-data-cleanser-with-llms
Uses LLMs (ChatGPT Chat Completion API) to cleanse data.

## Installation
```
 npm init
 npm install
```

## Usage
```
 node ClassifyData.js > outlog.log
```
You will need to change the script to change filename
The script excepts a CSV file called test.csv
You indicate the src column name and the dest col name (the CSV file must have headers).

A new destFile is created. It will have an additional column called destCol in it with the normalized data value.


## Prompt
The main prompt we are using is

```
1. Arts and Humanities: Includes majors such as literature, philosophy, history, and visual and performing arts.
2. Social Sciences: Includes majors like psychology, sociology, anthropology, political science, and international relations.
3. Business and Management: Covers majors such as marketing, finance, economics, business administration, and accounting.
4. Life Sciences and Agriculture: Encompasses biology, environmental sciences, animal sciences, agriculture, and related fields.
5. Physical Sciences: Includes majors such as physics, chemistry, astronomy, and geology.
6. Mathematics Statistics and Computer Science: Covers fields like applied mathematics, pure mathematics, statistics, computer science, and data science.
7. Engineering and Technology: Encompasses electrical, mechanical, civil, aerospace engineering, and many other branches, plus fields like information technology and systems engineering.
8. Medicine Health and Allied Sciences: Includes nursing, pre-med, medical school, and similar areas, along with related fields like pharmacy, dentistry, and public health.
9. Education and Teaching: Encompasses fields like elementary education, higher education, educational leadership, curriculum development, and special education.
10. Communication and Media Studies: Covers majors such as journalism, mass communication, media production, advertising, and public relations.
11. All Other Programs: Anything that doesn't fit in the programs above.

The above information pertains to categories of undergraduate programs. Categorize the below data into one of the program categories above.

Desired Format: CSV of response number, program number

Data:
###
1. Chem E
2. Literature
3. Physics
4. Health sciences
5. Mechanical Engineering
###
```

The Response from the LLM is:
```
1, 7
2, 1
3, 5
4, 8
5, 7
```