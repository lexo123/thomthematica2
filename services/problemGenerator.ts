import { MathProblem, Operation, GameMode, FigureType, MeasurementType, MissingPart, ShapeVariant } from '../types';

export const CORRECT_PHRASES = [
  "ყოჩაღ, თომა კაი ბიჭი ხარ",
  "სააღოლ ძმაო",
  "მალადეეც",
  "ბრავო",
  "შენ აღარ ხუმრობ",
  "მათემატიკოსი კაცი ხარ"
];

export const INCORRECT_PHRASES = [
  "არა ბიჭო რა []",
  "[] არა იის",
  "[] რანაირად არის, წესიერად დაითვალე",
  "არასწორია, ასეთი ჭკვიანი კაცი მაგას როგორ ვერ ხვდები"
];

export const TIME_LIMIT = 10;

export const IRREGULAR_QUADRILATERALS: ShapeVariant[] = [
  { points: "10,20 90,10 70,90 20,70", texts: [{x:"50", y:"10", anchor:"middle"}, {x:"90", y:"55"}, {x:"45", y:"95", anchor:"middle"}, {x:"5", y:"45", anchor:"end"}] },
  { points: "20,10 80,30 90,80 10,90", texts: [{x:"50", y:"15", anchor:"middle"}, {x:"95", y:"55"}, {x:"50", y:"95", anchor:"middle"}, {x:"5", y:"50", anchor:"end"}] },
  { points: "10,40 60,10 90,60 40,90", texts: [{x:"30", y:"20", anchor:"end"}, {x:"85", y:"30"}, {x:"75", y:"85"}, {x:"20", y:"75", anchor:"end"}] },
  { points: "30,10 90,20 80,90 10,60", texts: [{x:"60", y:"10", anchor:"middle"}, {x:"95", y:"55"}, {x:"45", y:"90", anchor:"middle"}, {x:"10", y:"30", anchor:"end"}] },
  { points: "10,10 90,40 60,90 20,80", texts: [{x:"50", y:"20", anchor:"middle"}, {x:"85", y:"70"}, {x:"40", y:"95", anchor:"middle"}, {x:"5", y:"45", anchor:"end"}] }
];

export const IRREGULAR_PENTAGONS: ShapeVariant[] = [
  { points: "40,10 95,20 80,90 10,80 5,40", texts: [{x:"65", y:"10"}, {x:"95", y:"60"}, {x:"45", y:"100", anchor:"middle"}, {x:"0", y:"70", anchor:"end"}, {x:"15", y:"20", anchor:"end"}] },
  { points: "60,10 90,50 60,90 10,80 20,30", texts: [{x:"80", y:"25"}, {x:"85", y:"75"}, {x:"35", y:"95", anchor:"middle"}, {x:"5", y:"60", anchor:"end"}, {x:"35", y:"15", anchor:"end"}] },
  { points: "20,20 80,10 90,60 50,90 10,60", texts: [{x:"50", y:"10", anchor:"middle"}, {x:"95", y:"35"}, {x:"75", y:"85"}, {x:"25", y:"85", anchor:"end"}, {x:"5", y:"40", anchor:"end"}] },
  { points: "30,10 70,20 90,70 40,90 10,50", texts: [{x:"50", y:"10", anchor:"middle"}, {x:"90", y:"40"}, {x:"70", y:"90"}, {x:"20", y:"80", anchor:"end"}, {x:"10", y:"25", anchor:"end"}] },
  { points: "10,30 50,10 90,40 80,90 20,80", texts: [{x:"30", y:"15", anchor:"end"}, {x:"75", y:"20"}, {x:"95", y:"70"}, {x:"50", y:"95", anchor:"middle"}, {x:"5", y:"60", anchor:"end"}] }
];

export const IRREGULAR_HEXAGONS: ShapeVariant[] = [
  { points: "30,10 90,5 95,50 70,95 15,85 5,40", texts: [{x:"60", y:"5"}, {x:"100", y:"30"}, {x:"90", y:"80"}, {x:"40", y:"105", anchor:"middle"}, {x:"5", y:"75", anchor:"end"}, {x:"10", y:"20", anchor:"end"}] },
  { points: "20,20 60,10 90,40 80,80 40,90 10,60", texts: [{x:"40", y:"10", anchor:"middle"}, {x:"80", y:"20"}, {x:"95", y:"65"}, {x:"60", y:"95", anchor:"middle"}, {x:"20", y:"85", anchor:"end"}, {x:"5", y:"40", anchor:"end"}] },
  { points: "40,10 80,20 90,60 60,90 20,80 10,40", texts: [{x:"60", y:"10", anchor:"middle"}, {x:"95", y:"35"}, {x:"85", y:"85"}, {x:"40", y:"95", anchor:"middle"}, {x:"10", y:"70", anchor:"end"}, {x:"20", y:"20", anchor:"end"}] },
  { points: "10,40 40,10 80,20 90,70 50,90 20,70", texts: [{x:"20", y:"20", anchor:"end"}, {x:"60", y:"10", anchor:"middle"}, {x:"95", y:"45"}, {x:"75", y:"90"}, {x:"30", y:"90", anchor:"end"}, {x:"5", y:"55", anchor:"end"}] },
  { points: "30,20 70,10 95,50 70,90 30,80 5,50", texts: [{x:"50", y:"10", anchor:"middle"}, {x:"90", y:"25"}, {x:"90", y:"80"}, {x:"50", y:"95", anchor:"middle"}, {x:"10", y:"75", anchor:"end"}, {x:"10", y:"30", anchor:"end"}] }
];

export const generateProblem = (mode: GameMode, questionIndex: number = 0): MathProblem => {
  if (mode === GameMode.Kveshmicera) {
    let n1 = Math.floor(Math.random() * 88) + 11; // 11-99
    let n2 = Math.floor(Math.random() * 88) + 11; // 11-99
    while (n1 % 10 === 0) n1 = Math.floor(Math.random() * 88) + 11;
    while (n2 % 10 === 0 || Math.floor(n2 / 10) === 0) n2 = Math.floor(Math.random() * 88) + 11;
    const ans = n1 * n2;
    return {
      category: 'math',
      num1: n1,
      num2: n2,
      operation: Operation.Multiply,
      answer: ans,
      missingPart: 'result',
      equationResult: ans
    };
  }

  if (mode === GameMode.Gethometria) {
    let figure: FigureType;
    let measurement: MeasurementType;

    if (questionIndex % 3 === 2) {
      const areaFigures: FigureType[] = ['square', 'rectangle'];
      figure = areaFigures[Math.floor(Math.random() * areaFigures.length)];
      measurement = 'area';
    } else {
      const figures: FigureType[] = ['square', 'rectangle', 'triangle', 'pentagon', 'hexagon', 'irregular_pentagon', 'irregular_hexagon', 'irregular_quadrilateral'];
      figure = figures[Math.floor(Math.random() * figures.length)];
      
      let possibleMeasurements: MeasurementType[] = ['perimeter', 'sidesCount', 'anglesCount'];
      if (figure === 'square' || figure === 'rectangle') {
        possibleMeasurements.push('area');
      }
      measurement = possibleMeasurements[Math.floor(Math.random() * possibleMeasurements.length)];
    }
    
    let sides: number[] = [];
    let answer = 0;

    const getSidesAndAngles = (fig: FigureType) => {
      switch(fig) {
        case 'triangle': return 3;
        case 'square': case 'rectangle': case 'irregular_quadrilateral': return 4;
        case 'pentagon': case 'irregular_pentagon': return 5;
        case 'hexagon': case 'irregular_hexagon': return 6;
      }
    };

    if (measurement === 'sidesCount' || measurement === 'anglesCount') {
      answer = getSidesAndAngles(figure);
      const a = Math.floor(Math.random() * 5) + 3;
      if (figure === 'rectangle') sides = [a, a+2];
      else if (figure === 'triangle') sides = [a, a, a];
      else if (figure === 'irregular_pentagon') sides = [a, a+1, a+2, a-1, a];
      else if (figure === 'irregular_hexagon') sides = [a, a+1, a+2, a-1, a, a+3];
      else if (figure === 'irregular_quadrilateral') sides = [a, a+1, a+2, a-1];
      else sides = [a];
    } else {
      if (figure === 'square') {
        const a = Math.floor(Math.random() * 9) + 2; // 2-დან 10-მდე
        sides = [a];
        answer = measurement === 'perimeter' ? 4 * a : a * a;
      } else if (figure === 'rectangle') {
        const a = Math.floor(Math.random() * 8) + 2;
        let b = Math.floor(Math.random() * 8) + 2;
        while (a === b) b = Math.floor(Math.random() * 8) + 2; // არ უნდა იყოს კვადრატი
        sides = [a, b];
        answer = measurement === 'perimeter' ? 2 * (a + b) : a * b;
      } else if (figure === 'triangle') {
        const a = Math.floor(Math.random() * 8) + 3;
        const b = Math.floor(Math.random() * 8) + 3;
        const minC = Math.abs(a - b) + 1;
        const maxC = a + b - 1;
        const c = Math.floor(Math.random() * (maxC - minC + 1)) + minC;
        sides = [a, b, c];
        answer = a + b + c;
      } else if (figure === 'pentagon') {
        const a = Math.floor(Math.random() * 6) + 2;
        sides = [a];
        answer = 5 * a;
      } else if (figure === 'hexagon') {
        const a = Math.floor(Math.random() * 6) + 2;
        sides = [a];
        answer = 6 * a;
      } else if (figure === 'irregular_pentagon') {
        sides = Array.from({length: 5}, () => Math.floor(Math.random() * 6) + 2);
        answer = sides.reduce((sum, val) => sum + val, 0);
      } else if (figure === 'irregular_hexagon') {
        sides = Array.from({length: 6}, () => Math.floor(Math.random() * 6) + 2);
        answer = sides.reduce((sum, val) => sum + val, 0);
      } else if (figure === 'irregular_quadrilateral') {
        sides = Array.from({length: 4}, () => Math.floor(Math.random() * 6) + 2);
        answer = sides.reduce((sum, val) => sum + val, 0);
      }
    }

    let shapeVariant: number | undefined;
    if (figure.startsWith('irregular_')) {
      shapeVariant = Math.floor(Math.random() * 5);
    }

    return {
      category: 'geometry',
      figure,
      measurement,
      sides,
      shapeVariant,
      answer
    };
  }

  if (mode === GameMode.ThomravlebisTabula) {
    const n1 = Math.floor(Math.random() * 11); // 0-10
    const n2 = Math.floor(Math.random() * 11); // 0-10
    const equationResult = n1 * n2;
    return {
      category: 'math',
      num1: n1,
      num2: n2,
      operation: Operation.Multiply,
      answer: equationResult,
      missingPart: 'result',
      equationResult: equationResult
    };
  }

  const operations = [Operation.Add, Operation.Subtract, Operation.Multiply, Operation.Divide];
  const op = operations[Math.floor(Math.random() * operations.length)];

  if (op === Operation.Add || op === Operation.Subtract) {
    while (true) {
      const possibleOps = [Operation.Add, Operation.Subtract];
      const op1 = possibleOps[Math.floor(Math.random() * possibleOps.length)];
      const op2 = possibleOps[Math.floor(Math.random() * possibleOps.length)];

      const n1 = Math.floor(Math.random() * 30) + 10; 
      const n2 = Math.floor(Math.random() * 20) + 1;  
      const n3 = Math.floor(Math.random() * 20) + 1;  

      let tempAns = 0;
      if (op1 === Operation.Add) tempAns = n1 + n2;
      else tempAns = n1 - n2;

      if (op2 === Operation.Add) tempAns = tempAns + n3;
      else tempAns = tempAns - n3;

      if (tempAns >= 0) {
        return { 
          category: 'math',
          num1: n1, 
          num2: n2, 
          num3: n3, 
          operation: op1, 
          operation2: op2, 
          answer: tempAns,
          missingPart: 'result',
          equationResult: tempAns
        };
      }
    }
  }

  let equationResult = 0;
  let finalAnswer = 0;
  let missing: MissingPart = 'result';
  let n1 = 0;
  let n2 = 0;

  switch (op) {
    case Operation.Multiply:
      n1 = Math.floor(Math.random() * 10) + 1;
      n2 = Math.floor(Math.random() * 10) + 1;
      equationResult = n1 * n2;
      break;
    case Operation.Divide:
      equationResult = Math.floor(Math.random() * 10) + 1;
      n2 = Math.floor(Math.random() * 9) + 2;
      n1 = equationResult * n2;
      break;
  }

  if (Math.random() > 0.5) {
    missing = 'num2';
    finalAnswer = n2;
  } else {
    missing = 'result';
    finalAnswer = equationResult;
  }

  return { 
    category: 'math',
    num1: n1, 
    num2: n2, 
    operation: op, 
    answer: finalAnswer, 
    missingPart: missing,
    equationResult: equationResult 
  };
};
