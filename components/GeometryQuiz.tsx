import React from 'react';
import { MathProblem } from '../types';
import { IRREGULAR_PENTAGONS, IRREGULAR_HEXAGONS, IRREGULAR_QUADRILATERALS } from '../services/problemGenerator';

interface GeometryQuizProps {
  problem: MathProblem;
}

export const GeometryQuiz: React.FC<GeometryQuizProps> = ({ problem }) => {
  return (
    <div className="space-y-6">
      <p className="text-gray-500 font-medium uppercase tracking-wider text-sm md:text-base">
        {problem.measurement === 'sidesCount' ? 'რამდენი გვერდი აქვს ამ ფიგურას?' : 
         problem.measurement === 'anglesCount' ? 'რამდენი კუთხე აქვს ამ ფიგურას?' : (
          <>
            გამოთვალე {
              problem.figure === 'irregular_quadrilateral' ? 'ოთხკუთხედის' : 
              problem.figure === 'square' ? 'კვადრატის' : 
              problem.figure === 'rectangle' ? 'მართკუთხედის' : 
              problem.figure === 'triangle' ? 'სამკუთხედის' : 
              (problem.figure === 'pentagon' || problem.figure === 'irregular_pentagon') ? 'ხუთკუთხედის' : 'ექვსკუთხედის'
            } <span className="text-indigo-600 font-bold">{problem.measurement === 'perimeter' ? 'პერიმეტრი' : 'ფართობი'}</span>:
          </>
        )}
      </p>
      
      {/* წესიერი ფიგურებისთვის მინიშნება */}
      {(problem.figure === 'pentagon' || problem.figure === 'hexagon') && problem.measurement === 'perimeter' && (
        <p className="text-pink-500 font-bold text-sm -mt-4 mb-4">
          (ყველა გვერდი ერთმანეთის ტოლია)
        </p>
      )}
      
      <div className="relative flex items-center justify-center py-8">
        {problem.figure === 'square' && (
          <div className="relative w-32 h-32 border-4 border-blue-500 bg-blue-100/50 shadow-inner">
            {(problem.measurement === 'perimeter' || problem.measurement === 'area') && (
              <>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-2xl text-blue-700">{problem.sides![0]}</span>
                <span className="absolute -right-8 top-1/2 -translate-y-1/2 font-bold text-2xl text-blue-700">{problem.sides![0]}</span>
              </>
            )}
          </div>
        )}
        {problem.figure === 'rectangle' && (
          <div className="relative w-48 h-32 border-4 border-green-500 bg-green-100/50 shadow-inner">
            {(problem.measurement === 'perimeter' || problem.measurement === 'area') && (
              <>
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 font-bold text-2xl text-green-700">{problem.sides![0]}</span>
                <span className="absolute -right-8 top-1/2 -translate-y-1/2 font-bold text-2xl text-green-700">{problem.sides![1]}</span>
              </>
            )}
          </div>
        )}
        {problem.figure === 'triangle' && (
          <div className="relative w-48 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points="50,10 10,90 90,90" fill="rgba(168, 85, 247, 0.2)" stroke="#a855f7" strokeWidth="4" strokeLinejoin="round" />
              {problem.measurement === 'perimeter' && (
                <>
                  <text x="20" y="50" className="text-lg font-bold fill-purple-700">{problem.sides![0]}</text>
                  <text x="80" y="50" className="text-lg font-bold fill-purple-700">{problem.sides![1]}</text>
                  <text x="50" y="110" className="text-lg font-bold fill-purple-700" textAnchor="middle">{problem.sides![2]}</text>
                </>
              )}
            </svg>
          </div>
        )}
        {problem.figure === 'pentagon' && (
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points="50,5 95,38 78,95 22,95 5,38" fill="rgba(236, 72, 153, 0.2)" stroke="#ec4899" strokeWidth="4" strokeLinejoin="round" />
              {problem.measurement === 'perimeter' && (
                <text x="50" y="110" className="text-lg font-bold fill-pink-600" textAnchor="middle">{problem.sides![0]}</text>
              )}
            </svg>
          </div>
        )}
        {problem.figure === 'irregular_pentagon' && (
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points={IRREGULAR_PENTAGONS[problem.shapeVariant || 0].points} fill="rgba(236, 72, 153, 0.2)" stroke="#ec4899" strokeWidth="4" strokeLinejoin="round" />
              {problem.measurement === 'perimeter' && IRREGULAR_PENTAGONS[problem.shapeVariant || 0].texts.map((pos, idx) => (
                <text key={idx} x={pos.x} y={pos.y} className="text-sm font-bold fill-pink-600" textAnchor={pos.anchor || "start"}>{problem.sides![idx]}</text>
              ))}
            </svg>
          </div>
        )}
        {problem.figure === 'hexagon' && (
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points="50,5 93,25 93,75 50,95 7,75 7,25" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="4" strokeLinejoin="round" />
              {problem.measurement === 'perimeter' && (
                <text x="50" y="110" className="text-lg font-bold fill-amber-600" textAnchor="middle">{problem.sides![0]}</text>
              )}
            </svg>
          </div>
        )}
        {problem.figure === 'irregular_hexagon' && (
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points={IRREGULAR_HEXAGONS[problem.shapeVariant || 0].points} fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b" strokeWidth="4" strokeLinejoin="round" />
              {problem.measurement === 'perimeter' && IRREGULAR_HEXAGONS[problem.shapeVariant || 0].texts.map((pos, idx) => (
                <text key={idx} x={pos.x} y={pos.y} className="text-sm font-bold fill-amber-600" textAnchor={pos.anchor || "start"}>{problem.sides![idx]}</text>
              ))}
            </svg>
          </div>
        )}
        {problem.figure === 'irregular_quadrilateral' && (
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
              <polygon points={IRREGULAR_QUADRILATERALS[problem.shapeVariant || 0].points} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="4" strokeLinejoin="round" />
              {problem.measurement === 'perimeter' && IRREGULAR_QUADRILATERALS[problem.shapeVariant || 0].texts.map((pos, idx) => (
                <text key={idx} x={pos.x} y={pos.y} className="text-sm font-bold fill-blue-600" textAnchor={pos.anchor || "start"}>{problem.sides![idx]}</text>
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};
