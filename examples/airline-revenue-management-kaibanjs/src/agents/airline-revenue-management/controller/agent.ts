/**
 * @fileoverview KaibanJS Team for Airline Revenue Management A2A Agent
 *
 * This module defines the KaibanJS team that processes revenue management analysis requests.
 * The team uses a WorkflowDrivenAgent that executes a workflow with three steps:
 * 1. Extract URL and Routes Step - Extracts Excel URL and routes from user message using a dedicated extraction team
 * 2. Download, Parse and Extract Route Step - Downloads Excel, parses it, and extracts route data
 * 3. Execute Analysis Step - Executes the revenue management analysis using the original team
 *
 * @module agents/airline-revenue-management/controller/agent
 */

import { Agent, Task, Team } from 'kaibanjs';
import { createStep, createWorkflow } from '@kaibanjs/workflow';
import { z } from 'zod';
import * as XLSX from 'xlsx';

import revenueManagementAnalysisTeam from './revenue-management-analysis.team.kban';

/**
 * Clean currency values from Excel data
 */
const cleanCurrencyValues = (data: Record<string, unknown>[]): Record<string, unknown>[] => {
  return data.map((row) => {
    const cleanedRow = { ...row };
    Object.keys(cleanedRow).forEach((key) => {
      const value = cleanedRow[key];
      if (typeof value === 'string' && value.trim()) {
        const currencyMatch = value.match(/^[^\d]*(\d+(?:[.,]\d+)*)[^\d]*$/);
        if (currencyMatch && currencyMatch[1]) {
          const numericPart = currencyMatch[1].replace(',', '');
          const numericValue = parseFloat(numericPart);
          if (!isNaN(numericValue)) {
            cleanedRow[key] = numericValue;
          }
        }
      }
    });
    return cleanedRow;
  });
};

/**
 * Find airport columns dynamically
 */
const findAirportColumns = (
  row: Record<string, unknown>,
): {
  depColumn: string;
  arrColumn: string;
} => {
  const columnNames = Object.keys(row);
  if (columnNames.length === 0) {
    throw new Error('Row has no columns');
  }
  const firstColumn = columnNames[0];
  if (!firstColumn) {
    throw new Error('Row has no valid columns');
  }
  const depColumn = columnNames.find(
    (col) =>
      col.toLowerCase().includes('dep') ||
      col.toLowerCase().includes('origin') ||
      col.toLowerCase().includes('from'),
  );
  const arrColumn = columnNames.find(
    (col) =>
      col.toLowerCase().includes('arr') ||
      col.toLowerCase().includes('dest') ||
      col.toLowerCase().includes('to'),
  );
  const fallbackDepColumn: string = depColumn || firstColumn;
  const fallbackArrColumn: string = arrColumn || columnNames[1] || firstColumn;
  return { depColumn: fallbackDepColumn, arrColumn: fallbackArrColumn };
};

/**
 * Task 1: Text Extraction Agent
 * Extracts Excel URL and route information from user text input
 */
const textExtractionAgent = new Agent({
  name: 'Text Extraction Agent',
  role: 'Data Extraction Specialist',
  goal: 'Extract Excel file URL and route information from user text input',
  background:
    'Expert in natural language processing and data extraction. Specializes in identifying URLs and route codes (IATA format) from unstructured text.',
});

const extractUrlAndRoutesTask = new Task({
  title: 'Extract Excel URL and Route',
  description: `Extract the following information from the user's text {userMessage}:
    - Excel file URL (must be a publicly accessible URL)
    - Route information in IATA format (e.g., "LHR-SLC", "JFK-LAX")
    
    The text may contain:
    - URLs pointing to Excel files (.xlsx, .xls)
    - Route codes in various formats (origin-destination, origin to destination, etc.)
    - Additional context that should be ignored
    
    Extract only the URL and the route code. Route code should be in IATA format (3-letter airport codes separated by dash).
    If multiple routes are mentioned, extract the first one.`,
  agent: textExtractionAgent,
  expectedOutput: 'Structured data containing Excel URL and route code',
  outputSchema: z.object({
    excelUrl: z.string().url().describe('Public URL of the Excel file to download'),
    routes: z.array(z.string()).describe('Array of route codes in IATA format (e.g., ["LHR-SLC"])'),
    route: z
      .string()
      .describe(
        'The specific route to process (first route from the routes array, e.g., "LHR-SLC")',
      ),
  }),
});

/**
 * Team for URL and Route Extraction
 * Extracts Excel URL and route information from user text input
 */
const createExtractionTeam = (userMessage: string) => {
  return new Team({
    name: 'URL and Route Extraction Team',
    agents: [textExtractionAgent],
    tasks: [extractUrlAndRoutesTask],
    inputs: {
      userMessage,
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

/**
 * Step 1: Extract URL and Routes from User Message
 * Uses the extraction team to extract Excel URL and route information
 */
const extractUrlAndRoutesStep = createStep({
  id: 'extract-url-and-routes',
  inputSchema: z.object({
    userMessage: z.string(),
  }),
  outputSchema: z.object({
    excelUrl: z.string().url(),
    routes: z.array(z.string()),
    route: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { userMessage } = inputData as { userMessage: string };

    // Create and execute the extraction team
    const extractionTeam = createExtractionTeam(userMessage);
    const result = await extractionTeam.start();

    // Extract the result from the team execution
    // The result should contain excelUrl, routes, and route
    if (result && typeof result === 'object') {
      const extractedData = result.result as {
        excelUrl?: string;
        routes?: string[];
        route?: string;
      };

      if (!extractedData.excelUrl || !extractedData.route) {
        throw new Error('Failed to extract required data: excelUrl and route are required');
      }

      return {
        excelUrl: extractedData.excelUrl,
        routes: extractedData.routes || [extractedData.route],
        route: extractedData.route,
      };
    }

    throw new Error('Invalid result format from extraction team');
  },
});

/**
 * Step 2: Download, Parse Excel and Extract Route Data
 * Unified step that downloads Excel, parses it, and extracts data for the specified route
 */
const downloadParseAndExtractRouteStep = createStep({
  id: 'download-parse-extract-route',
  inputSchema: z.object({
    excelUrl: z.string().url(),
    routes: z.array(z.string()),
    route: z.string(),
  }),
  outputSchema: z.object({
    route: z.string(),
    origin: z.string(),
    destination: z.string(),
    analysisDate: z.string(),
    cyForecast: z.string(),
    pyData: z.string(),
    competitorFares: z.string(),
  }),
  execute: async ({ inputData }) => {
    const { excelUrl, route } = inputData as {
      excelUrl: string;
      routes: string[];
      route: string;
    };

    // Validate route format
    const [origin, destination] = route.split('-');
    if (!origin || !destination) {
      throw new Error(`Invalid route format: ${route}. Expected format: ORIGIN-DESTINATION`);
    }

    // Download Excel file
    const response = await fetch(excelUrl);
    if (!response.ok) {
      throw new Error(`Failed to download Excel file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });

    // Read sheets
    const cyForecastSheet = workbook.Sheets['CY Forecast'];
    const pyDataSheet = workbook.Sheets['PY Data'];
    const competitorFaresSheet = workbook.Sheets['Competitor Fares'];

    if (!cyForecastSheet) {
      throw new Error('Excel file must contain "CY Forecast" sheet');
    }

    // Parse Excel data
    const excelData = {
      cyForecast: cleanCurrencyValues(
        XLSX.utils.sheet_to_json(cyForecastSheet, {
          defval: null,
          raw: false,
          dateNF: 'mm/dd/yy',
        }) as Record<string, unknown>[],
      ),
      pyData: pyDataSheet
        ? cleanCurrencyValues(
            XLSX.utils.sheet_to_json(pyDataSheet, {
              defval: null,
              raw: false,
              dateNF: 'mm/dd/yy',
            }) as Record<string, unknown>[],
          )
        : [],
      competitorFares: competitorFaresSheet
        ? cleanCurrencyValues(
            XLSX.utils.sheet_to_json(competitorFaresSheet, {
              defval: null,
              raw: false,
              dateNF: 'mm/dd/yy',
            }) as Record<string, unknown>[],
          )
        : [],
    };

    // Find route data in each sheet
    if (excelData.cyForecast.length === 0) {
      throw new Error('CY Forecast sheet is empty');
    }
    const firstRow = excelData.cyForecast[0];
    if (!firstRow) {
      throw new Error('CY Forecast sheet has no valid rows');
    }
    const { depColumn, arrColumn } = findAirportColumns(firstRow);

    const cyForecastRow = excelData.cyForecast.find((row) => {
      const depAirportValue = row[depColumn];
      const arrAirportValue = row[arrColumn];
      const depAirport = typeof depAirportValue === 'string' ? depAirportValue.toUpperCase() : '';
      const arrAirport = typeof arrAirportValue === 'string' ? arrAirportValue.toUpperCase() : '';
      return depAirport === origin.toUpperCase() && arrAirport === destination.toUpperCase();
    });

    if (!cyForecastRow) {
      const availableRoutes = excelData.cyForecast
        .map((row) => {
          const dep = row[depColumn];
          const arr = row[arrColumn];
          return `${dep}-${arr}`;
        })
        .join(', ');
      throw new Error(
        `Route ${route} not found in CY Forecast sheet. Available routes: ${availableRoutes}`,
      );
    }

    const pyDataRow =
      excelData.pyData.length > 0
        ? excelData.pyData.find((row) => {
            const { depColumn: dep, arrColumn: arr } = findAirportColumns(row);
            const depAirportValue = row[dep];
            const arrAirportValue = row[arr];
            const depAirport =
              typeof depAirportValue === 'string' ? depAirportValue.toUpperCase() : '';
            const arrAirport =
              typeof arrAirportValue === 'string' ? arrAirportValue.toUpperCase() : '';
            return depAirport === origin.toUpperCase() && arrAirport === destination.toUpperCase();
          })
        : undefined;

    const competitorFaresRow =
      excelData.competitorFares.length > 0
        ? excelData.competitorFares.find((row) => {
            const { depColumn: dep, arrColumn: arr } = findAirportColumns(row);
            const depAirportValue = row[dep];
            const arrAirportValue = row[arr];
            const depAirport =
              typeof depAirportValue === 'string' ? depAirportValue.toUpperCase() : '';
            const arrAirport =
              typeof arrAirportValue === 'string' ? arrAirportValue.toUpperCase() : '';
            return depAirport === origin.toUpperCase() && arrAirport === destination.toUpperCase();
          })
        : undefined;

    return {
      route,
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      analysisDate: '2026-06-03', // Default date as specified
      cyForecast: JSON.stringify(cyForecastRow),
      pyData: pyDataRow ? JSON.stringify(pyDataRow) : '{}',
      competitorFares: competitorFaresRow ? JSON.stringify(competitorFaresRow) : '{}',
    };
  },
});

/**
 * Step 3: Execute Revenue Management Analysis
 * Uses the original team from airline-revenue-management app
 */
const executeAnalysisStep = createStep({
  id: 'execute-analysis',
  inputSchema: z.object({
    route: z.string(),
    origin: z.string(),
    destination: z.string(),
    analysisDate: z.string(),
    cyForecast: z.string(),
    pyData: z.string(),
    competitorFares: z.string(),
  }),
  outputSchema: z.unknown(),
  execute: async ({ inputData }) => {
    const { origin, destination, analysisDate, cyForecast, pyData, competitorFares } =
      inputData as {
        origin: string;
        destination: string;
        analysisDate: string;
        cyForecast: string;
        pyData: string;
        competitorFares: string;
      };

    // Execute the team with new inputs using team.start(inputs)
    const { result = '' } = await revenueManagementAnalysisTeam.start({
      origin,
      destination,
      analysisDate,
      cyForecast,
      pyData,
      competitorFares,
    });

    // Convert result to Record<string, unknown> for the output schema
    if (result && typeof result === 'object') {
      return result as unknown as Record<string, unknown>;
    }

    return result as string;
  },
});

/**
 * Workflow for Revenue Management Analysis
 * Now starts with extraction step that receives userMessage
 */
const analysisWorkflow = createWorkflow({
  id: 'revenue-management-analysis-workflow',
  inputSchema: z.object({
    userMessage: z.string(),
  }),
  outputSchema: z.record(z.unknown()),
});

// Chain workflow steps: extract -> download/parse -> execute analysis
analysisWorkflow
  .then(extractUrlAndRoutesStep)
  .then(downloadParseAndExtractRouteStep)
  .then(executeAnalysisStep);
analysisWorkflow.commit();

/**
 * Task 2: Workflow-Driven Analysis Agent
 */
const workflowAnalysisAgent = new Agent({
  type: 'WorkflowDrivenAgent',
  name: 'Revenue Management Workflow Agent',
  workflow: analysisWorkflow,
});

const executeAnalysisWorkflowTask = new Task({
  title: 'Execute Revenue Management Analysis Workflow',
  description:
    'Extract Excel URL and routes from user message, download Excel file, extract route data, and execute revenue management analysis using the predefined workflow',
  agent: workflowAnalysisAgent,
  expectedOutput: 'Complete revenue management analysis results',
});

/**
 * Create and export the team
 * Note: The team now only contains the WorkflowDrivenAgent which handles the entire workflow.
 * The workflow starts with extraction (extractUrlAndRoutesStep) that receives userMessage,
 * then proceeds to download/parse Excel (downloadParseAndExtractRouteStep),
 * and finally executes the analysis (executeAnalysisStep).
 */
export const createRevenueManagementTeam = (userMessage: string) => {
  return new Team({
    name: 'Airline Revenue Management Team',
    agents: [workflowAnalysisAgent],
    tasks: [executeAnalysisWorkflowTask],
    inputs: {
      userMessage,
    },
    env: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    },
  });
};

/**
 * Process revenue management request
 * This function creates the team, executes it, and returns the result as a JSON string
 */
export const processRevenueManagementRequest = async (userMessage: string) => {
  const team = createRevenueManagementTeam(userMessage);
  const { result = '' } = await team.start();

  // The result should contain the output from the workflow
  // We need to extract the final result from the workflow execution
  if (result && typeof result === 'object') {
    return JSON.stringify(result);
  }

  return result as string;
};
