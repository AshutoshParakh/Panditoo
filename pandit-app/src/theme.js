export const colors = { bg: "#F7F5F1", surface: "#FFFFFF", ink: "#25221F", muted: "#847B73", primary: "#712F32", primarySoft: "#F1E2DF", border: "#E5DDD5", green: "#277657", greenSoft: "#E5F2EB", gold: "#A96F2B", goldSoft: "#F5E9D5", blue: "#496987", blueSoft: "#E9EFF5", danger: "#A24A46", dangerSoft: "#F8EAE8" };
export const shadow = { shadowColor: "#33231D", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 2 };
export const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
