"use client";

import { useState } from "react";
import Papa from "papaparse";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { UploadCloud, Activity, AlertTriangle, CheckCircle, Droplet, Percent, User, Calendar } from "lucide-react";

export default function Dashboard() {
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ TIR: 0, TBR: 0, TAR: 0 });
  const [clinicalStats, setClinicalStats] = useState({ avgGlucose: 0, cv: 0, gmi: 0, totalReadings: 0, dateRange: "", patientId: "" });
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const COLORS = ["#ff6666", "#99ff99", "#ffcc99"];

  const handleFileUpload = (event: any) => {
    const file = event.target.files[0];
    if (!file) return;
    setLoading(true);
    setError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          
          if (!data || data.length === 0) throw new Error("CSV file is empty");

          const firstRow = data[0];
          const columns = Object.keys(firstRow);
          
          const glucoseCol = columns.find(col => 
            col.toLowerCase().includes('glucose') || col.toLowerCase().includes('measurement') || col === 'Value'
          );
          const timestampCol = columns.find(col => 
            col.toLowerCase().includes('timestamp') || col.toLowerCase().includes('time') || col.toLowerCase().includes('date')
          );

          if (!glucoseCol) throw new Error(`No glucose column found. Available columns: ${columns.join(", ")}`);

          // Find the patient column dynamically, or use the filename as a backup
          const patientCol = columns.find(col => col.toLowerCase().includes('patient') || col.toLowerCase() === 'id');
          const detectedPatient = patientCol && data[0][patientCol] 
            ? String(data[0][patientCol]) 
            : file.name.replace('.csv', '');

          let tbrCount = 0, tirCount = 0, tarCount = 0;
          const glucoseValues: number[] = [];

          const formattedData = data.map((row) => {
            const glucoseStr = String(row[glucoseCol]).trim();
            let glucose = parseFloat(glucoseStr);
            
            if (!isNaN(glucose)) {
              if (glucose > 0 && glucose < 40) glucose = glucose * 18.0182; // Smart Converter
              
              glucoseValues.push(glucose);

              if (glucose < 70) tbrCount++;
              else if (glucose <= 180) tirCount++;
              else tarCount++;
            }

            const rawTime = timestampCol && row[timestampCol] ? String(row[timestampCol]) : "";
            const timeLabel = rawTime.length > 10 ? rawTime.substring(11, 16) : rawTime;

            return { time: timeLabel, rawDate: rawTime, glucose: Math.round(glucose) };
          }).filter(row => !isNaN(row.glucose) && row.glucose > 0);

          if (formattedData.length === 0) throw new Error("No valid glucose data found");

          setChartData(formattedData);

          // Calculate Basic TIR
          const total = tbrCount + tirCount + tarCount;
          setMetrics({
            TBR: parseFloat(((tbrCount / total) * 100).toFixed(1)),
            TIR: parseFloat(((tirCount / total) * 100).toFixed(1)),
            TAR: parseFloat(((tarCount / total) * 100).toFixed(1)),
          });

          // --- ADVANCED CLINICAL METRICS (%CV, GMI, Average) ---
          const sum = glucoseValues.reduce((a, b) => a + b, 0);
          const mean = sum / glucoseValues.length;
          
          const sqDiff = glucoseValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
          const stdDev = Math.sqrt(sqDiff / glucoseValues.length);
          const cv = (stdDev / mean) * 100;
          
          const gmi = 3.31 + (0.02392 * mean); // ADA formula for Estimated A1c

          const startDate = formattedData[0].rawDate ? formattedData[0].rawDate.split(" ")[0] : "Unknown";
          const endDate = formattedData[formattedData.length - 1].rawDate ? formattedData[formattedData.length - 1].rawDate.split(" ")[0] : "Unknown";

          setClinicalStats({
            avgGlucose: Math.round(mean),
            cv: parseFloat(cv.toFixed(1)),
            gmi: parseFloat(gmi.toFixed(1)),
            totalReadings: glucoseValues.length,
            dateRange: startDate === endDate ? startDate : `${startDate} to ${endDate}`,
            patientId: detectedPatient
          });

          // AI Prediction Call
          if (formattedData.length >= 3) {
            const lastIndex = formattedData.length - 1;
            const currentGlucose = formattedData[lastIndex].glucose;
            const velocity = currentGlucose - formattedData[lastIndex - 1].glucose;
            const rollingAvg = (currentGlucose + formattedData[lastIndex - 1].glucose + formattedData[lastIndex - 2].glucose) / 3;

            try {
              const response = await fetch("http://127.0.0.1:8000/predict-risk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  Glucose_mg_dL: currentGlucose,
                  Glucose_Velocity: velocity,
                  Rolling_Avg_Glucose: rollingAvg
                }),
              });
              if (!response.ok) throw new Error(`Backend error`);
              setPrediction(await response.json());
            } catch (error) {
              setPrediction({ status: "OFFLINE", risk_message: "Backend AI server offline. Dashboard running locally." });
            }
          }
        } catch (err: any) {
          setError(err.message || "Error parsing CSV");
          setChartData([]);
        }
        setLoading(false);
      },
      error: (error) => {
        setError("Error reading CSV: " + error.message);
        setLoading(false);
      }
    });
  };

  const pieData = [
    { name: "Below Range (<70)", value: metrics.TBR },
    { name: "In Range (70-180)", value: metrics.TIR },
    { name: "Above Range (>180)", value: metrics.TAR },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Area */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
              <Activity className="text-blue-600" /> FreeStyle Libre Analytics
            </h1>
            {chartData.length > 0 ? (
              <div className="flex items-center gap-4 mt-2 text-slate-600 font-medium">
                <span className="flex items-center gap-1 capitalize"><User size={16}/> {clinicalStats.patientId}</span>
                <span className="flex items-center gap-1"><Calendar size={16}/> {clinicalStats.dateRange}</span>
              </div>
            ) : (
              <p className="text-slate-500 mt-1">Upload patient CGM data (.csv) to generate AGP and AI Risk alerts.</p>
            )}
          </div>
          <div className="relative">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center gap-2 transition-all">
              <UploadCloud size={20} /> {loading ? "Analyzing..." : chartData.length > 0 ? "Upload New File" : "Upload Patient CSV"}
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-300 p-4 rounded-lg text-red-900 font-semibold">Error: {error}</div>}

        {chartData.length > 0 && (
          <>
            {/* The AI Prediction Banner */}
            <div className={`p-4 rounded-xl border-l-8 shadow-sm flex items-center gap-4 ${
              prediction?.status === "DANGER" ? "bg-red-50 border-red-500 text-red-900" : 
              prediction?.status === "OFFLINE" ? "bg-slate-100 border-slate-400 text-slate-700" : "bg-green-50 border-green-500 text-green-900"
            }`}>
              {prediction?.status === "DANGER" ? <AlertTriangle size={32} className="text-red-500"/> : 
               prediction?.status === "OFFLINE" ? <AlertTriangle size={32} className="text-slate-400"/> : <CheckCircle size={32} className="text-green-500"/>}
              <div>
                <h2 className="text-xl font-bold">AI Risk Status: {prediction?.status || "LOADING"}</h2>
                <p className="font-medium opacity-90">{prediction?.risk_message || "Analyzing patient data..."}</p>
              </div>
            </div>

            {/* Clinical Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Droplet size={16}/> Avg Glucose</span>
                <span className="text-3xl font-extrabold text-slate-800">{clinicalStats.avgGlucose} <span className="text-base font-medium text-slate-500">mg/dL</span></span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Percent size={16}/> Estimated A1c (GMI)</span>
                <span className="text-3xl font-extrabold text-slate-800">{clinicalStats.gmi}%</span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Activity size={16}/> Variability (%CV)</span>
                <span className="text-3xl font-extrabold text-slate-800 flex items-baseline gap-2">
                  {clinicalStats.cv}% 
                  <span className={`text-sm font-medium ${clinicalStats.cv <= 36 ? 'text-green-500' : 'text-orange-500'}`}>
                    {clinicalStats.cv <= 36 ? '(Goal met)' : '(High)'}
                  </span>
                </span>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Readings</span>
                <span className="text-3xl font-extrabold text-slate-800">{clinicalStats.totalReadings.toLocaleString()}</span>
              </div>
            </div>

            {/* Main Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Trend Line */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold mb-4">Continuous Glucose Trend (mg/dL)</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                      <XAxis dataKey="time" minTickGap={30} />
                      <YAxis domain={[0, 400]} />
                      <Tooltip />
                      <ReferenceArea y1={70} y2={180} fill="#99ff99" fillOpacity={0.2} />
                      <ReferenceArea y1={0} y2={70} fill="#ff6666" fillOpacity={0.2} />
                      <ReferenceArea y1={180} y2={400} fill="#ffcc99" fillOpacity={0.2} />
                      <Line type="monotone" dataKey="glucose" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center">
                <h3 className="text-lg font-bold mb-2">Time-In-Range (TIR)</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}