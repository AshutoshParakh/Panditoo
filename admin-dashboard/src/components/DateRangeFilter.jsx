import React from "react";
import { DatePicker, Space, Button } from "antd";
import { CalendarOutlined, ClearOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

export function DateRangeFilter({ value = [null, null], onChange, style }) {
  const startDate = value && value[0] ? dayjs(value[0]) : null;
  const endDate = value && value[1] ? dayjs(value[1]) : null;
  const rangeValue = startDate && endDate ? [startDate, endDate] : null;

  const handleRangeChange = (dates) => {
    if (!dates || !dates[0] || !dates[1]) {
      onChange([null, null]);
    } else {
      onChange([
        dates[0].format("YYYY-MM-DD"),
        dates[1].format("YYYY-MM-DD"),
      ]);
    }
  };

  const setPreset = (preset) => {
    const today = dayjs();
    let start, end;

    if (preset === "today") {
      start = today;
      end = today;
    } else if (preset === "7days") {
      start = today.subtract(6, "day");
      end = today;
    } else if (preset === "30days") {
      start = today.subtract(29, "day");
      end = today;
    } else if (preset === "month") {
      start = today.startOf("month");
      end = today.endOf("month");
    }

    if (start && end) {
      onChange([start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD")]);
    }
  };

  return (
    <Space wrap style={{ alignItems: "center", ...style }}>
      <RangePicker
        value={rangeValue}
        onChange={handleRangeChange}
        format="DD MMM YYYY"
        allowClear
        placeholder={["Start Date", "End Date"]}
        style={{ borderRadius: 6 }}
      />
      <Button.Group size="middle">
        <Button
          type={
            rangeValue &&
            startDate?.isSame(dayjs(), "day") &&
            endDate?.isSame(dayjs(), "day")
              ? "primary"
              : "default"
          }
          onClick={() => setPreset("today")}
        >
          Today
        </Button>
        <Button
          type={
            rangeValue &&
            startDate?.isSame(dayjs().subtract(6, "day"), "day") &&
            endDate?.isSame(dayjs(), "day")
              ? "primary"
              : "default"
          }
          onClick={() => setPreset("7days")}
        >
          Last 7 Days
        </Button>
        <Button
          type={
            rangeValue &&
            startDate?.isSame(dayjs().subtract(29, "day"), "day") &&
            endDate?.isSame(dayjs(), "day")
              ? "primary"
              : "default"
          }
          onClick={() => setPreset("30days")}
        >
          Last 30 Days
        </Button>
      </Button.Group>
      {rangeValue && (
        <Button
          icon={<ClearOutlined />}
          onClick={() => onChange([null, null])}
          type="text"
          danger
        >
          Clear Dates
        </Button>
      )}
    </Space>
  );
}
