import React from 'react';
import { MathProblem } from '../types';

interface MathQuizProps {
  problem: MathProblem;
}

export const MathQuiz: React.FC<MathQuizProps> = ({ problem }) => {
  return (
    <div className="space-y-2">
      <p className="text-gray-500 font-medium uppercase tracking-wider text-sm">
        {problem.missingPart === 'result' ? 'გამოთვალე:' : 'იპოვე გამოტოვებული რიცხვი:'}
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 text-5xl md:text-7xl font-black text-gray-800">
        <span className="text-blue-600">
          {problem.missingPart === 'num1' ? <span className="text-orange-400">?</span> : problem.num1}
        </span>
        <span className="text-purple-500">{problem.operation}</span>
        <span className="text-blue-600">
          {problem.missingPart === 'num2' ? <span className="text-orange-400">?</span> : problem.num2}
        </span>
        {problem.operation2 && problem.num3 !== undefined && (
          <>
            <span className="text-purple-500">{problem.operation2}</span>
            <span className="text-blue-600">{problem.num3}</span>
          </>
        )}
        {problem.missingPart !== 'result' && (
          <>
            <span className="text-gray-400">=</span>
            <span className="text-gray-800">{problem.equationResult}</span>
          </>
        )}
      </div>
    </div>
  );
};
