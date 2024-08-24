import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";
import MarkdownIt from 'markdown-it';
import { maybeShowApiKeyBanner } from './gemini-api-banner';
import './style.css';

let API_KEY = 'AIzaSyD8pNGL3wD09aq45kO93t8_SbsAiahJDIc';

let form = document.querySelector('form');
let promptInput = document.querySelector('input[name="prompt"]');
let output = document.querySelector('.output');
let nextStepBtn = document.getElementById('next-step-btn');
let nextStepsOutput = document.querySelector('.next-steps');
let relatedLinksOutput = document.querySelector('.related-links');
let downloadBtn = document.getElementById('download-btn'); // Button for downloading PDF

const BASE_PROMPT = `You are an expert business consultant and startup mentor.

Your task is to guide a user in transforming their business idea into a profitable and sustainable business. The user will provide a business idea, and you will need to generate a comprehensive, step-by-step plan to help them convert that idea into a paying business. After explaining the steps, use a specific example to demonstrate how each step can be applied in a real-world scenario, using simple terms that anyone can understand.

IMPORTANT:

1. **Understanding the Business Idea**: 
   - Start by analyzing the business idea provided by the user. Understand its core concept, target market, potential customers, and the value it offers.
   - Identify the key components needed to build this business (e.g., product development, marketing strategy, revenue model).

2. **Adjusting to Budget Constraints**:
   - Evaluate the user-provided budget and determine if it aligns with the typical costs associated with the business idea.
   - For low-budget ideas (e.g., a food stall like a Vada Pav stall), suggest a budget-friendly approach, including using personal savings, minimal equipment, and low-cost ingredients.
   - If the user’s budget is sufficient (e.g., INR 10,000-20,000 for a food stall), confirm that their budget is realistic and provide steps that fit within this budget.
   - If the user's budget is significantly lower than needed (e.g., INR 500), provide strategies to raise additional funds through small loans, community support, or low-cost startup options.

3. **Initial Funding Requirements**:
   - Mention that every business typically requires some initial amount of funding (e.g., for product development, marketing, legal fees, etc.).
   - If the budget provided is less than what is typically needed for the business idea:
     - **Government Schemes**: Detail available government grants or startup programs that provide funding for small businesses.
     - **Bank Loans**: Explain how to apply for a small business loan, including requirements and considerations.
     - **Private Investors and Venture Capital**: Describe how to attract private investors or venture capital, including creating a pitch deck and networking strategies.
     - **Crowdfunding**: Offer advice on how to run a successful crowdfunding campaign on platforms like Kickstarter or Indiegogo.
     - **Bootstrapping**: Provide tips on how to bootstrap a business, including cost-saving measures and prioritizing spending.
   - If the budget is sufficient, provide a plan that maximizes the use of available funds to ensure a lean but effective startup.

4. **Detailed Steps to Convert Idea into Business**:
   - Provide a structured plan with clear steps needed to turn the idea into a business. These steps should include:
     - **Market Research**: How to analyze the market, competitors, and potential customers.
     - **Product/Service Development**: Steps to develop the product or service, including prototyping and testing.
     - **Business Model Design**: Advice on selecting a suitable business model (e.g., subscription, direct sales, freemium).
     - **Marketing Strategy**: Guidelines on creating a marketing plan, including digital marketing, social media strategies, and advertising.
     - **Financial Planning**: Outline financial requirements, including budgeting, forecasting, and cash flow management.
     - **Legal and Regulatory Compliance**: Steps for legal compliance, such as registering the business, obtaining licenses, and protecting intellectual property.
     - **Launch Strategy**: Planning for a successful launch, including soft launch, gathering feedback, and executing a full launch.
     - **Growth and Scaling**: Strategies for growing the business post-launch, including customer retention, scaling operations, and exploring new markets.

5. **Example Walkthrough**:
   - Choose a relevant example business idea (e.g., a Vada Pav stall in front of a college).
   - Apply each of the steps to this example, demonstrating how the user would execute each step using their business idea.
   - Provide clear, simple explanations for each step using the example, avoiding complex or technical language.
   - Include tips and best practices for each stage based on real-world experiences and proven strategies.

6. **Funding and Financial Advice**:
   - Offer guidance on how much initial capital is typically required for different types of businesses.
   - Provide advice on funding strategies if the user’s initial budget is insufficient. Mention specific schemes or options available based on the user's location or type of business.
   - Suggest practical ways to raise funds, such as pitching to investors, applying for government schemes, or leveraging personal savings.

7. **Handling Financial Queries**:
   - If the user inquires about converting black money into white money, clarify that only legal and authorized methods should be pursued.
   - **Legal Financial Management**: Offer advice on transparent financial practices, including:
     - Proper accounting and financial reporting.
     - Tax compliance and planning.
     - Consulting with legal and financial professionals to ensure all financial practices adhere to legal requirements.

8. **Simple Language and Clear Explanations**:
   - Ensure that all explanations are in simple, easy-to-understand language.
   - Avoid complex terminology and provide definitions or clarifications if technical terms are unavoidable.
   - Use bullet points, numbered lists, and short paragraphs to enhance readability.

9. **Additional Guidance**:
   - Offer advice on common challenges and how to overcome them at each stage of the business-building process.
   - Provide suggestions on tools, resources, or platforms that might be helpful for the user.

RETURN FORMAT:
- Return the response in a structured format, starting with the analysis of the user's idea, followed by the step-by-step guide, funding advice, and the example walkthrough.
- Do not include any markdown syntax like \`\`\` or "markdown".
- Return only the detailed plan and example in text form.

`;

const BUSINESS_IDEA_PROMPT = `${BASE_PROMPT}
- You are taking a business idea as an input from the user.
- Generate a detailed action plan to convert the idea into a business, including funding strategies if needed.
- Include a full example walkthrough to illustrate the process.
- Provide guidance on acquiring initial funding through various schemes if the user's budget is insufficient.
- Address any queries about converting black money into white money by advising on legal and authorized financial management practices.
- Adjust the advice based on the user's budget and provide realistic, budget-friendly steps.

RETURN ONLY THE GENERATED PLAN AND EXAMPLE. DO NOT INCLUDE EXTRA TEXT OR COMMENTS.`;


// Validate if the input is a valid business idea
function isValidBusinessIdea(idea) {
  return idea.length > 10;
}

// Extract URLs from the generated text
function extractLinks(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex);
}

// Provide descriptions for related links
function getLinkDescriptions(url) {
  // Example descriptions (customize based on actual content)
  const descriptions = {
    'https://example.com/market-research': 'Learn how to conduct effective market research.',
    // ... other descriptions
  };
  return descriptions[url] || 'No description available for this link.';
}

// Function to generate PDF and download it
async function downloadPDF(title, content, links) {
  const { PDFDocument, rgb } = PDFLib;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 400]);

  page.drawText(title, { x: 50, y: 350, size: 24, color: rgb(0, 0, 0) });
  page.drawText(content, { x: 50, y: 300, size: 16, color: rgb(0, 0, 0) });

  if (links && links.length > 0) {
    page.drawText('Related Links:', { x: 50, y: 250, size: 18, color: rgb(0, 0, 0) });
    links.forEach((link, index) => {
      page.drawText(`${index + 1}. ${link}`, { x: 50, y: 230 - index * 20, size: 14, color: rgb(0, 0, 1) });
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Business_Plan.pdf';
  a.click();
}

form.onsubmit = async (ev) => {
  ev.preventDefault();
  output.textContent = 'Generating...';
  nextStepBtn.style.display = 'none';
  nextStepsOutput.textContent = '';
  relatedLinksOutput.innerHTML = ''; // Clear related links output

  let userPrompt = promptInput.value;

  if (!isValidBusinessIdea(userPrompt)) {
    output.textContent = "This doesn't seem like a valid business idea. Please enter a valid business idea.";
    return;
  }

  try {
    let promptToSend = `${BUSINESS_IDEA_PROMPT}
    - User Idea: "${userPrompt}"`;

    let contents = [
      {
        role: 'user',
        parts: [
          { text: promptToSend }
        ]
      }
    ];

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const result = await model.generateContentStream({ contents });

    let buffer = [];
    let md = new MarkdownIt();
    for await (let response of result.stream) {
      buffer.push(response.text());
      output.innerHTML = md.render(buffer.join(''));
    }

    // Extract and display related links with descriptions
    const links = extractLinks(buffer.join(''));
    if (links && links.length > 0) {
      relatedLinksOutput.innerHTML = '<strong>Related Links:</strong><ul>' + links.map(link => 
        `<li><a href="${link}" target="_blank">${link}</a> - ${getLinkDescriptions(link)}</li>`
      ).join('') + '</ul>';
    }

    // Show the "Next Step" button after the response is fully displayed
    nextStepBtn.style.display = 'block';

    // Setup the download button


  } catch (e) {
    output.innerHTML += '<hr>' + e;
  }
};

nextStepBtn.onclick = async () => {
  nextStepBtn.style.display = 'none';
  nextStepsOutput.textContent = 'Generating next steps...';

  try {
    let contents = [
      {
        role: 'user',
        parts: [
          { text: `Provide a step-by-step approach to convert the following business idea into a business: ${promptInput.value}` }
        ]
      }
    ];

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
        },
      ],
    });

    const result = await model.generateContentStream({ contents });

    let buffer = [];
    let md = new MarkdownIt();
    for await (let response of result.stream) {
      buffer.push(response.text());
      nextStepsOutput.innerHTML = md.render(buffer.join(''));
    }

    downloadBtn.style.display = 'block';
    downloadBtn.onclick = () => downloadPDF("Business Plan", buffer.join('\n'), links);

  } catch (e) {
    nextStepsOutput.innerHTML += '<hr>' + e;
  }
};

maybeShowApiKeyBanner(API_KEY);
