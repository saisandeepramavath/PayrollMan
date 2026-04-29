import React, { useEffect, useState } from 'react';
import apiService from '../../api/client';
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { Card } from '../../components/ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

interface Project {
  id: number;
  code: string;
  name: string;
  sub_code: string;
  department: string;
  description: string;
}

interface ProjectMetrics {
  code: string;
  name: string;
  sub_code: string;
  total_hours: number;
  allocation_count: number;
  employees_assigned: number;
}

interface SubCategoryMetrics {
  sub_code: string;
  project_count: number;
  total_hours: number;
  avg_hours_per_project: number;
  total_employees: number;
}

const SUB_CODE_COLORS: { [key: string]: string } = {
  'technical-development': '#3b82f6',
  'infrastructure': '#8b5cf6',
  'testing': '#ec4899',
  'security': '#f59e0b',
  'monitoring': '#10b981',
  'reporting': '#06b6d4',
};

const ProjectProgressDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [subCategoryMetrics, setSubCategoryMetrics] = useState<SubCategoryMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch all projects
      const projectsRes = await apiService.get('/projects/');
      const projectsData = projectsRes.data;
      setProjects(projectsData);

      // Calculate metrics from projects
      const metrics: { [key: string]: ProjectMetrics } = {};
      const subCategoryMap: { [key: string]: SubCategoryMetrics } = {};

      projectsData.forEach((project: Project) => {
        // Initialize project metrics
        metrics[project.code] = {
          code: project.code,
          name: project.name,
          sub_code: project.sub_code,
          total_hours: Math.floor(Math.random() * 400) + 100, // Simulated hours
          allocation_count: Math.floor(Math.random() * 50) + 10,
          employees_assigned: Math.floor(Math.random() * 8) + 2,
        };

        // Aggregate sub-category metrics
        if (!subCategoryMap[project.sub_code]) {
          subCategoryMap[project.sub_code] = {
            sub_code: project.sub_code,
            project_count: 0,
            total_hours: 0,
            avg_hours_per_project: 0,
            total_employees: 0,
          };
        }

        subCategoryMap[project.sub_code].project_count += 1;
        subCategoryMap[project.sub_code].total_hours += metrics[project.code].total_hours;
        subCategoryMap[project.sub_code].total_employees += metrics[project.code].employees_assigned;
      });

      // Calculate averages
      Object.values(subCategoryMap).forEach((metric) => {
        metric.avg_hours_per_project = Math.round(metric.total_hours / metric.project_count);
      });

      setProjectMetrics(Object.values(metrics));
      setSubCategoryMetrics(Object.values(subCategoryMap));

      // Generate time series data (last 30 days)
      const timeSeriesMap: { [key: string]: { date: string; hours: number } } = {};
      for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        timeSeriesMap[dateStr] = { date: dateStr, hours: 0 };
      }

      projectsData.forEach(() => {
        Object.keys(timeSeriesMap).forEach((dateStr) => {
          timeSeriesMap[dateStr].hours += Math.floor(Math.random() * 40) + 10;
        });
      });

      setTimeSeriesData(Object.values(timeSeriesMap));
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg text-slate-600 dark:text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </Card>
      </div>
    );
  }

  const totalProjects = projects.length;
  const totalHours = projectMetrics.reduce((sum, m) => sum + m.total_hours, 0);
  const totalEmployees = new Set(projectMetrics.map(m => m.employees_assigned)).size;

  const pieData = subCategoryMetrics.map((m) => ({
    name: m.sub_code.replace(/-/g, ' ').toUpperCase(),
    value: m.total_hours,
    fill: SUB_CODE_COLORS[m.sub_code] || '#6b7280',
  }));

  const barData = subCategoryMetrics.map((m) => ({
    name: m.sub_code.replace(/-/g, ' ').toUpperCase(),
    projects: m.project_count,
    hours: m.avg_hours_per_project,
    employees: m.total_employees,
    fill: SUB_CODE_COLORS[m.sub_code] || '#6b7280',
  }));
  const chartGrid = theme === 'dark' ? '#334155' : '#e2e8f0';
  const chartText = theme === 'dark' ? '#cbd5e1' : '#475569';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
    border: `1px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
    borderRadius: '8px',
    color: theme === 'dark' ? '#f8fafc' : '#0f172a',
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">Project Progress Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400">Comprehensive visualization of project metrics and work allocation</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-6">
            <div className="text-gray-200 text-sm font-medium mb-2">Total Projects</div>
            <div className="text-4xl font-bold">{totalProjects}</div>
            <div className="text-blue-100 text-xs mt-2">Across all categories</div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6">
            <div className="text-gray-200 text-sm font-medium mb-2">Total Hours Logged</div>
            <div className="text-4xl font-bold">{totalHours.toLocaleString()}</div>
            <div className="text-purple-100 text-xs mt-2">Across all projects</div>
          </Card>

          <Card className="bg-gradient-to-br from-pink-600 to-pink-700 text-white p-6">
            <div className="text-gray-200 text-sm font-medium mb-2">Categories</div>
            <div className="text-4xl font-bold">{subCategoryMetrics.length}</div>
            <div className="text-pink-100 text-xs mt-2">Technical classifications</div>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white p-6">
            <div className="text-gray-200 text-sm font-medium mb-2">Engineers</div>
            <div className="text-4xl font-bold">{totalEmployees}</div>
            <div className="text-emerald-100 text-xs mt-2">Assigned to projects</div>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Hours by Category - Pie Chart */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Hours Distribution by Category</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}h`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `${value.toLocaleString()} hours`}
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Category Metrics - Bar Chart */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Category Overview</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12, fill: chartText }} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: chartText }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: chartText }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="projects" fill="#3b82f6" name="Projects" />
                <Bar yAxisId="left" dataKey="employees" fill="#8b5cf6" name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Time Series Chart */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Daily Hours Trend (Last 30 Days)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: chartText }}
                interval={Math.floor(timeSeriesData.length / 6)}
              />
              <YAxis tick={{ fontSize: 12, fill: chartText }} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value) => `${value} hours`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="hours"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Total Hours"
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Projects Table */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Project Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Total Hours</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Allocations</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Employees</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 dark:text-slate-300">Progress</th>
                </tr>
              </thead>
              <tbody>
                {projectMetrics.map((metric, index) => {
                  const maxHours = Math.max(...projectMetrics.map(m => m.total_hours));
                  const progressPercent = (metric.total_hours / maxHours) * 100;

                  return (
                    <tr
                      key={index}
                      className="border-b border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-slate-100">{metric.code}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{metric.name}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{
                            backgroundColor: SUB_CODE_COLORS[metric.sub_code] || '#6b7280',
                          }}
                        >
                          {metric.sub_code.replace(/-/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{metric.total_hours.toLocaleString()}h</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{metric.allocation_count}</td>
                      <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300">{metric.employees_assigned}</td>
                      <td className="px-6 py-4">
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${progressPercent}%`,
                              backgroundColor: SUB_CODE_COLORS[metric.sub_code] || '#6b7280',
                            }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Sub-Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {subCategoryMetrics.map((metric, index) => (
            <div
              key={index}
              className="rounded-xl border border-slate-200 bg-white p-6 border-l-4 dark:border-slate-700 dark:bg-slate-900"
              style={{ borderLeftColor: SUB_CODE_COLORS[metric.sub_code] || '#6b7280' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {metric.sub_code.replace(/-/g, ' ').toUpperCase()}
                </h3>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SUB_CODE_COLORS[metric.sub_code] || '#6b7280' }}
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Projects</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metric.project_count}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Total Hours</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metric.total_hours.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Avg Hours/Project</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metric.avg_hours_per_project}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400 text-sm">Engineers</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">{metric.total_employees}</span>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(metric.total_hours / totalHours) * 100}%`,
                      backgroundColor: SUB_CODE_COLORS[metric.sub_code] || '#6b7280',
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {((metric.total_hours / totalHours) * 100).toFixed(1)}% of total hours
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProjectProgressDashboard;
