import { Agent, Task, Team } from 'kaibanjs';
import { z } from 'zod';

// Single Agent for Revenue Management Analysis
const revenueManagementAgent = new Agent({
  name: 'Revenue Management Analyst',
  role: 'Pricing Strategy Specialist',
  goal: 'Analyze route data and generate optimal fare recommendations following standardized revenue management methodology and best practices.',
  background:
    'Expert revenue management analyst with deep knowledge of airline pricing strategies, competitive analysis, demand forecasting, and fare optimization. Specializes in applying standardized decision-making frameworks to ensure consistent and accurate pricing recommendations.',
});

// Single Task for Complete Analysis and Recommendation
const analyzeRouteAndRecommendTask = new Task({
  title: 'Route Analysis and Fare Recommendation',
  description: `Analyze route data and generate optimal fare recommendations using this streamlined methodology:

    CALCULATIONS (Execute in order):
    1. Competitor Median = (Airline A + Airline B + Airline C) / 3
    2. Market Position: BELOW_MARKET if Model Fare < Competitor Median - $25, ABOVE_MARKET if Model Fare > Competitor Median + $25, else AT_MARKET
    3. Load Factor Category: HIGH if >0.8, LOW if <0.6, else MEDIUM
    4. Demand Trend: INCREASING if Model FC > PY Fare, DECREASING if Model FC < PY Fare, else STABLE
    5. WeekDay Category: Weekend if WeekDay 5-7, else Weekday

    FARE RECOMMENDATION RULES (Apply in priority order):
    
    PRIORITY 1 - Demand Trend (OVERRIDES ALL OTHER RULES):
    - INCREASING: Max 5% fare change (conservative for growing demand)
    - DECREASING: Set fare = Competitor Median (competitive positioning)
    - STABLE: Apply rules below

    PRIORITY 2 - Market Position:
    - BELOW_MARKET with >$50 gap: Increase to 95% of Competitor Median
    - ABOVE_MARKET with >$100 gap: Decrease to 102% of Competitor Median

    PRIORITY 3 - Load Factor:
    - HIGH (>0.8): +5% fare increase
    - LOW (<0.6): -5% fare decrease

    PRIORITY 4 - Special Events:
    - Contains "festival" or "tournament": +8% fare increase
    - Contains "competitor": -8% fare decrease

    PRIORITY 5 - Weekday Adjustment:
    - Weekend (5-7): Premium pricing allowed above competitor median
    - Weekday (1-4): Competitive pricing, align with or below competitor median

    FINAL CALCULATIONS:
    - Percentage Change = ((AI Suggested Fare - Model Fare) / Model Fare) * 100
    - Change Magnitude: SIGNIFICANT_CHANGE if >10%, else STANDARD
    - Approval Required: YES if >10%, else NO

    JUSTIFICATION FORMAT:
    Provide concise reasoning referencing: competitor pricing, load factor, demand trend, weekday, and special events.

    Data: Route {origin}-{destination}, Date {analysisDate}, CY: {cyForecast}, PY: {pyData}, Competitors: {competitorFares}`,
  agent: revenueManagementAgent,
  expectedOutput:
    'Comprehensive route analysis with detailed calculations and fare recommendation following standardized revenue management methodology',
});

// Create the Simplified Revenue Management Analysis Team
const team = new Team({
  name: 'Revenue Management Analysis Team',
  agents: [revenueManagementAgent],
  tasks: [analyzeRouteAndRecommendTask],
  inputs: {
    origin: 'LHR',
    destination: 'SLC',
    analysisDate: '2026-06-03',
    cyForecast: JSON.stringify({
      'Dep Airport': 'LHR',
      'Arr Airport': 'SLC',
      'Model Fare': 1200,
      'Load Factor': 0.75,
      'Model FC': 850,
      Rating: 4.2,
      WeekDay: 6,
    }),
    pyData: JSON.stringify({
      'Dep Airport': 'LHR',
      'Arr Airport': 'SLC',
      'PY Fare': 1150,
      'Special Events': 'None',
    }),
    competitorFares: JSON.stringify({
      'Dep Airport': 'LHR',
      'Arr Airport': 'SLC',
      'Airline A': 1300,
      'Airline B': 1250,
      'Airline C': 1180,
    }),
  },
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  },
});

export default team;
