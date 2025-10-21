import { GoogleGenAI, Type } from "@google/genai";
import { Project, ParsedWorkLog, PerformanceMetrics, Evaluation, EvaluationCriterionKey } from '../types';
import { EVALUATION_CRITERIA_KEYS, EVALUATION_CRITERIA_LABELS } from '../constants';

// FIX: Initialize the GoogleGenAI client according to the guidelines.
// The API key must be sourced from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Parses a natural language string of work logs into a structured array.
 * @param reportText - The string containing work logs (e.g., "Project Alpha planning 4h, Project Bravo design 2h").
 * @param projects - An array of available projects to validate against.
 * @param context - The context of the report, either 'plan' or 'actual'.
 * @returns A promise that resolves to an array of ParsedWorkLog objects.
 */
export async function parseWorkReport(reportText: string, projects: Project[], context: 'plan' | 'actual'): Promise<ParsedWorkLog[]> {
    const projectNames = projects.map(p => p.name).join(', ');

    const systemInstruction = `You are an intelligent assistant for a project management tool. Your task is to parse a user's work report text into a structured JSON format. The user will provide a list of their tasks and the hours spent. You must match the project names from the user's text to the provided list of valid project names. If a project name in the user text is ambiguous or not in the list, choose the most likely project from the list. The output must be a JSON array of objects.`;

    const prompt = `
        Please parse the following work report text into a JSON array.
        Each object in the array should have three fields: "projectName", "task", and "hours".
        
        Valid Project Names: [${projectNames}]
        
        Work Report Text: "${reportText}"
        
        JSON Output:
    `;

    // FIX: Define a response schema for structured JSON output as per Gemini API guidelines.
    const schema = {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                projectName: {
                    type: Type.STRING,
                    description: 'The name of the project. Must be one of the valid project names provided.'
                },
                task: {
                    type: Type.STRING,
                    description: 'The description of the task performed.'
                },
                hours: {
                    type: Type.NUMBER,
                    description: 'The number of hours spent on the task.'
                },
            },
            required: ['projectName', 'task', 'hours']
        }
    };

    try {
        // FIX: Use the recommended `ai.models.generateContent` method.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ parts: [{ text: prompt }] }], // Using full contents structure
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        // FIX: Extract text directly from `response.text` and parse it.
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText) as ParsedWorkLog[];
        
        // Basic validation
        if (!Array.isArray(parsedResult)) {
            throw new Error("AI response is not a valid array.");
        }
        
        return parsedResult;

    } catch (e) {
        console.error("Error parsing work report with Gemini:", e);
        throw new Error("AI analysis failed. Please check your input format or try again.");
    }
}

/**
 * Generates all evaluation comments (per-criterion and final summary) based on scores.
 * @param evaluation - The evaluation object containing scores.
 * @param userName - The name of the user being evaluated.
 * @returns A promise that resolves to an object containing all generated comments.
 */
export async function generateMonthlyEvaluationReport(evaluation: Evaluation, userName: string): Promise<{ criteriaComments: Record<EvaluationCriterionKey, string>; finalComment: string; }> {
    const systemInstruction = "You are an HR performance analyst. Your task is to write a comprehensive monthly performance report for a team member based on specific evaluation criteria and scores. You must generate insightful comments for EACH criterion and a final overall summary. The entire output must be in Korean and in a structured JSON format.";
    
    const criteriaText = EVALUATION_CRITERIA_KEYS.map(key => {
        const criteria = evaluation.criteria[key];
        const label = EVALUATION_CRITERIA_LABELS[key];
        return `- ${label}: ${criteria.score}/5`;
    }).join('\n');

    const prompt = `
        Please generate professional and constructive performance evaluation comments for '${userName}' for the month of ${evaluation.month}.
        
        Based on the scores provided below, create a specific, evidence-based comment for each evaluation criterion and a final summary comment.
        
        **Evaluation Scores:**
        ${criteriaText}

        **Instructions:**
        - For each criterion, write a comment that reflects the given score. High scores should have positive comments, and low scores should have constructive feedback.
        - The final summary should synthesize the individual points into a coherent overview, highlighting strengths and areas for development.
        - The entire response must be in JSON format.
    `;
    
    const properties: Record<string, { type: Type, description: string }> = {};
    EVALUATION_CRITERIA_KEYS.forEach(key => {
        properties[key] = {
            type: Type.STRING,
            description: `A specific comment for the '${EVALUATION_CRITERIA_LABELS[key]}' criterion.`
        };
    });

    const schema = {
        type: Type.OBJECT,
        properties: {
            criteriaComments: {
                type: Type.OBJECT,
                properties: properties,
                required: EVALUATION_CRITERIA_KEYS
            },
            finalComment: {
                type: Type.STRING,
                description: 'A comprehensive final summary of the monthly performance.'
            }
        },
        required: ['criteriaComments', 'finalComment']
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        const jsonText = response.text.trim();
        const parsedResult = JSON.parse(jsonText) as { criteriaComments: Record<EvaluationCriterionKey, string>; finalComment: string; };
        return parsedResult;

    } catch (e) {
        console.error("Error generating monthly evaluation report with Gemini:", e);
        throw new Error("Failed to generate AI report. Please try again.");
    }
}

/**
 * Generates an annual performance evaluation report based on a year of monthly data.
 * @param evaluations - An array of monthly evaluation objects.
 * @param userName - The name of the user being evaluated.
 * @param year - The year of the evaluation.
 * @returns A promise that resolves to a string containing the annual evaluation report.
 */
export async function generateAnnualEvaluationReport(evaluations: Evaluation[], userName: string, year: number): Promise<string> {
    if (evaluations.length === 0) {
        return "선택된 연도에 대한 평가 데이터가 없어 연간 리포트를 생성할 수 없습니다.";
    }
    
    const systemInstruction = "You are a senior HR manager summarizing a team member's annual performance. Your tone should be comprehensive, strategic, and focus on long-term growth and contribution. The report should be written in Korean.";

    const monthlySummaries = evaluations.map(ev => {
        const avgScore = (EVALUATION_CRITERIA_KEYS.reduce((sum, key) => sum + ev.criteria[key].score, 0) / EVALUATION_CRITERIA_KEYS.length).toFixed(1);
        return `
### ${ev.month}
- **Average Score:** ${avgScore}/5.0
- **Manager's Comment:** "${ev.finalComment}"
        `;
    }).join('\n');

    const prompt = `
        Please generate a comprehensive annual performance report for '${userName}' for the year ${year}.

        The report should analyze performance trends, identify patterns of strengths and weaknesses, and provide a strategic outlook for the coming year.
        
        **Monthly Evaluation Data:**
        ${monthlySummaries}

        **Report Structure:**
        1.  **Annual Performance Summary:** A high-level overview of the year's performance, noting overall achievements and contributions.
        2.  **Performance Trends & Patterns:** Analyze the monthly data to identify trends. Is performance consistent? Is there improvement in certain areas over time? Are there recurring challenges?
        3.  **Key Accomplishments & Strengths:** Based on the yearly data, what are the most significant strengths and accomplishments?
        4.  **Strategic Development Goals for Next Year:** Propose 2-3 high-level development goals for the upcoming year based on the identified patterns and areas for growth.
        
        Please write the entire report in professional Korean.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: prompt,
            config: {
                systemInstruction,
                temperature: 0.6,
            },
        });
        
        return response.text;
    } catch (e) {
        console.error("Error generating annual evaluation report with Gemini:", e);
        throw new Error("Failed to generate AI annual report. Please try again.");
    }
}