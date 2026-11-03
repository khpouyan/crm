// data/clinics-data.ts

export type PlanType = "clinic" | "office" | "free";

export interface ClinicUser {
  id: string;
  fullName: string;
  centerName: string;
  phoneNumber: string;
  plan: PlanType;
  daysRemaining: number;
  city: string;
}

export const sampleClinics: ClinicUser[] = [
  { id: "CLN-101", fullName: "دکتر سارا احمدی", centerName: "کلینیک تخصصی پوست آراسته", phoneNumber: "09121112233", plan: "clinic", daysRemaining: 145, city: "تهران" },
  { id: "CLN-102", fullName: "دکتر مهران علوی", centerName: "مطب زیبایی دکتر علوی", phoneNumber: "09122223344", plan: "office", daysRemaining: 18, city: "مشهد" },
  { id: "CLN-103", fullName: "دکتر پرستو راد", centerName: "کلینیک لیزر و جوانسازی نگین", phoneNumber: "09133334455", plan: "clinic", daysRemaining: 0, city: "اصفهان" },
  { id: "CLN-104", fullName: "دکتر کامران فیاض", centerName: "مطب جراحی زیبایی فیاض", phoneNumber: "09174445566", plan: "free", daysRemaining: 3, city: "شیراز" },
  { id: "CLN-105", fullName: "دکتر نیلوفر امانی", centerName: "کلینیک جامع تخصصی هیراد", phoneNumber: "09145556677", plan: "clinic", daysRemaining: 84, city: "تبریز" },
  { id: "CLN-106", fullName: "دکتر حمید کاظمی", centerName: "مطب پوست و مو کاظمی", phoneNumber: "09166667788", plan: "office", daysRemaining: 0, city: "اهواز" },
  { id: "CLN-107", fullName: "دکتر زهرا پورمند", centerName: "کلینیک زیبایی پرشین لند", phoneNumber: "09217778899", plan: "clinic", daysRemaining: 210, city: "تهران" },
  { id: "CLN-108", fullName: "دکتر آرش کیانی", centerName: "مطب تخصصی دکتر کیانی", phoneNumber: "09358889900", plan: "free", daysRemaining: 0, city: "کرج" },
  { id: "CLN-109", fullName: "دکتر مژگان صبوری", centerName: "کلینیک تخصصی لیزر یاس", phoneNumber: "09119990011", plan: "clinic", daysRemaining: 62, city: "رشت" },
  { id: "CLN-110", fullName: "دکتر وحید بهرامی", centerName: "مطب پوست و مو بهرامی", phoneNumber: "09181122334", plan: "office", daysRemaining: 125, city: "کرمانشاه" },
];