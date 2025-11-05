import { Card } from "@/components/ui/card";
import ReactECharts from "echarts-for-react";

interface ChartRendererProps {
  type: string;
  title: string;
  data: any[];
  xField: string;
  yField: string;
  colorScheme: string;
  width: number;
  height: number;
}

const colorSchemes = {
  blue: ["#3b82f6", "#60a5fa", "#93c5fd", "#dbeafe"],
  green: ["#10b981", "#34d399", "#6ee7b7", "#d1fae5"],
  purple: ["#8b5cf6", "#a78bfa", "#c4b5fd", "#ede9fe"],
  orange: ["#f97316", "#fb923c", "#fdba74", "#fed7aa"],
};

export function ChartRenderer({
  type,
  title,
  data,
  xField,
  yField,
  colorScheme,
  width,
  height,
}: ChartRendererProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border rounded bg-muted/10"
        style={{ width, height }}
      >
        <span className="text-sm text-muted-foreground">Configure os dados do gráfico</span>
      </div>
    );
  }

  const colors = colorSchemes[colorScheme as keyof typeof colorSchemes] || colorSchemes.blue;

  const getOption = () => {
    const categories = data.map((item) => item[xField.replace(/[\[\]]/g, "")] || "");
    const values = data.map((item) => {
      const field = yField.replace(/[\[\]]/g, "");
      return item[field] || 0;
    });

    const baseOption = {
      title: {
        text: title,
        left: "center",
        textStyle: { fontSize: 14 },
      },
      tooltip: {
        trigger: type === "pie" ? "item" : "axis",
      },
      color: colors,
      grid: {
        left: "10%",
        right: "10%",
        bottom: "15%",
        top: "20%",
        containLabel: true,
      },
    };

    switch (type) {
      case "bar":
        return {
          ...baseOption,
          xAxis: {
            type: "category",
            data: categories,
            axisLabel: { rotate: 45, fontSize: 10 },
          },
          yAxis: { type: "value" },
          series: [
            {
              type: "bar",
              data: values,
              itemStyle: {
                borderRadius: [4, 4, 0, 0],
              },
            },
          ],
        };

      case "line":
        return {
          ...baseOption,
          xAxis: {
            type: "category",
            data: categories,
            axisLabel: { fontSize: 10 },
          },
          yAxis: { type: "value" },
          series: [
            {
              type: "line",
              data: values,
              smooth: true,
              areaStyle: {
                opacity: 0.3,
              },
            },
          ],
        };

      case "pie":
        return {
          ...baseOption,
          tooltip: {
            trigger: "item",
            formatter: "{b}: {c} ({d}%)",
          },
          series: [
            {
              type: "pie",
              radius: ["40%", "70%"],
              center: ["50%", "60%"],
              data: categories.map((name, idx) => ({
                name,
                value: values[idx],
              })),
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: "rgba(0, 0, 0, 0.5)",
                },
              },
              label: {
                fontSize: 10,
              },
            },
          ],
        };

      case "area":
        return {
          ...baseOption,
          xAxis: {
            type: "category",
            data: categories,
            axisLabel: { fontSize: 10 },
          },
          yAxis: { type: "value" },
          series: [
            {
              type: "line",
              data: values,
              areaStyle: {},
              smooth: true,
            },
          ],
        };

      default:
        return baseOption;
    }
  };

  return (
    <div style={{ width, height }}>
      <ReactECharts
        option={getOption()}
        style={{ width: "100%", height: "100%" }}
        opts={{ renderer: "svg" }}
      />
    </div>
  );
}
