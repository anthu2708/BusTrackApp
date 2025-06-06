export const getDayCode = () => {
  const dayMap: Record<number, string> = {
    0: 'Sun',
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
    6: 'Sat',
  };
  return dayMap[new Date().getDay()];
};

export const isToday = (start: string, end: string, days: string): boolean => {
  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
  const code = getDayCode();
  const inRange = start <= today && today <= end;
  const matchDay = days.split(',').map(d => d.trim()).includes(code);
  return inRange && matchDay;
};

export const getNextClassToday = (scheduleData: any[]) => {
  const todayClasses = scheduleData
    .filter((item) => isToday(item.start_date, item.end_date, item.days))
    .sort((a, b) => (a.start_time > b.start_time ? 1 : -1));

  return todayClasses.length > 0 ? todayClasses[0] : null;
};

export const getTodayClasses = (scheduleData: any[]) => {
  return scheduleData
    .filter(item => isToday(item.start_date, item.end_date, item.days))
    .sort((a, b) => (a.start_time > b.start_time ? 1 : -1));
};
