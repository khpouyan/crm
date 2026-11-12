"use client"

import * as React from "react"
import {
  Building2,
  User,
  Phone,
  Globe,
  MapPin,
  Send,
  MessageCircle,
  Share2,
  HardDrive,
  MessageSquare,
  Mic,
  Bot,
  Database,
  Calculator,
  Headphones,
  BellRing,
  CreditCard,
  Tag,
  Sliders,
  Plus,
  Sparkles,
  ExternalLink,
  Layers,
  FileSpreadsheet
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CitySelector } from "@/components/ui/city-selector"

// const IRAN_PROVINCES: Record<string, string[]> = {
//   "تهران": ["تهران", "شهریار", "اسلامشهر", "ورامین", "دماوند", "شمیرانات", "ری"],
//   "خراسان رضوی": ["مشهد", "نیشابور", "سبزوار", "تربت حیدریه", "قوچان", "گناباد"],
//   "اصفهان": ["اصفهان", "کاشان", "خمینی‌شهر", "نجف‌آباد", "شاهین‌شهر", "شهرضا"],
//   "فارس": ["شیراز", "مرودشت", "کازرون", "فسا", "جهرم", "لارستان"],
//   "آذربایجان شرقی": ["تبریز", "مراغه", "مرند", "میانه", "اهر", "بناب"],
//   "خوزستان": ["اهواز", "دزفول", "آبادان", "خرمشهر", "ماهشهر", "شوشتر"],
//   "مازندران": ["ساری", "بابل", "آمل", "قائم‌شهر", "چالوس", "تنکابن"],
//   "گیلان": ["رشت", "بندر انزلی", "لاهیجان", "لنگرود", "تالش", "فومن"],
//   "البرز": ["کرج", "فردیس", "نظرآباد", "ساوجبلاغ", "اشتهارد"],
//   "کرمان": ["کرمان", "سیرجان", "رفسنجان", "جیرفت", "بم"],
// }

export interface ClinicProfileProps {
  initialData?: {
    id: string
    name?: string
    managerName?: string
    registerPhone?: string
    officePhone?: string
    province?: string
    city?: string
    address?: string
    website?: string
    logo?: string
    socials?: {
      instagram?: { handle: string; phone: string }
      telegram?: { channel: string; phone: string }
      bale?: { channel: string; phone: string }
      rubika?: { channel: string; phone: string }
      eitaa?: { channel: string; phone: string }
    }
  }
}

export function ClinicProfile({ initialData }: ClinicProfileProps) {
  const [selectedProvince, setSelectedProvince] = React.useState(initialData?.province || "تهران")
  const [selectedCity, setSelectedCity] = React.useState(initialData?.city || "تهران")
  const [clinicName, setClinicName] = React.useState(initialData?.name || `کلینیک تخصصی (${initialData?.id || "ثبت‌شده"})`)
  const [managerName, setManagerName] = React.useState(initialData?.managerName || "دکتر سارا احمدی")
  const [registerPhone, setRegisterPhone] = React.useState(initialData?.registerPhone || "09121112233")
  const [officePhone, setOfficePhone] = React.useState(initialData?.officePhone || "02188776655")
  const [address, setAddress] = React.useState(initialData?.address || "خیابان ولیعصر، بالاتر از میدان ونک، برج نگین، طبقه ۴")
  const [website, setWebsite] = React.useState(initialData?.website || "https://arasteh-clinic.ir")

  const [socials, setSocials] = React.useState({
    instagram: { handle: initialData?.socials?.instagram?.handle || "@arasteh_skin", phone: initialData?.socials?.instagram?.phone || "09121112233" },
    telegram: { channel: initialData?.socials?.telegram?.channel || "@arasteh_clinic", phone: initialData?.socials?.telegram?.phone || "09121112233" },
    bale: { channel: initialData?.socials?.bale?.channel || "ble.ir/arasteh_med", phone: initialData?.socials?.bale?.phone || "09121112233" },
    rubika: { channel: initialData?.socials?.rubika?.channel || "rubika.ir/arasteh_clinic", phone: initialData?.socials?.rubika?.phone || "09121112233" },
    eitaa: { channel: initialData?.socials?.eitaa?.channel || "eitaa.com/arasteh_clinic", phone: initialData?.socials?.eitaa?.phone || "09121112233" },
  })

  const [activePlan, setActivePlan] = React.useState<"clinic" | "office" | "trial">("clinic")
  const [modules, setModules] = React.useState({
    storage: { enabled: true, usage: "۵.۲ ترابایت از ۸ ترابایت", plan: "حرفه‌ای" },
    sms: { enabled: true, usage: "۴۸,۲۵۰ عدد مانده", plan: "سفارشی سازمانی" },
    voiceAssistant: { enabled: true, usage: "فعال روی خطوط پاسخگویی", plan: "هوشمند PRO" },
    socialAssistant: { enabled: true, usage: "متصل به اینستاگرام و بله", plan: "پاسخگویی خودکار دایرکت" },
    dataExport: { enabled: true, usage: "خروجی اکسل و PACS", plan: "نامحدود" },
    commission: { enabled: true, usage: "محاسبه درصد پزشکان و پرسنل", plan: "فرمول ترکیبی" },
    callCenter: { enabled: false, usage: "VoIP ابری", plan: "غیرفعال" },
    smartFollowup: { enabled: true, usage: "یادآوری خودکار ویزیت و مراقبت", plan: "فعال" },
  })

  const toggleModule = (key: keyof typeof modules) => {
    setModules((prev) => ({
      ...prev,
      [key]: { ...prev[key], enabled: !prev[key].enabled },
    }))
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full" dir="rtl">
      <Card className="border-border/60 shadow-xs bg-card/60 backdrop-blur-sm">
        <CardContent className="p-4 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-2xl border-2 border-primary/20 shadow-xs">
              <AvatarImage src="/placeholder-clinic.png" alt={clinicName} />
              <AvatarFallback className="rounded-2xl text-lg font-bold bg-primary/10 text-primary">
                {clinicName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 text-right">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">{clinicName}</h2>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">
                  فعال ({initialData?.id})
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                <User className="h-3.5 w-3.5" />
                <span>مدیر مرکز: {managerName}</span>
                <span>•</span>
                <Phone className="h-3.5 w-3.5" />
                <span dir="ltr">{registerPhone}</span>
                <span>•</span>
                <MapPin className="h-3.5 w-3.5" />
                <span>{selectedProvince}، {selectedCity}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" />
              ورود به پنل کلینیک
            </Button>
            <Button size="sm" className="gap-1.5 text-xs">
              ذخیره تغییرات
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info" className="w-full">
        <div className="flex justify-center w-full mb-6">
          <TabsList className="h-11 p-1 bg-muted/60 border border-border/60 rounded-xl max-w-full overflow-x-auto justify-center">
            <TabsTrigger value="info" className="gap-2 text-xs rounded-lg px-4">
              <Building2 className="h-4 w-4" />
              اطلاعات کلینیک
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2 text-xs rounded-lg px-4">
              <Layers className="h-4 w-4" />
              پلن‌ها و ماژول‌ها
            </TabsTrigger>
            <TabsTrigger value="tickets" className="gap-2 text-xs rounded-lg px-4">
              <MessageSquare className="h-4 w-4" />
              تیکت‌ها
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 text-xs rounded-lg px-4">
              <Phone className="h-4 w-4" />
              مکالمات و پیامک‌ها
            </TabsTrigger>
            <TabsTrigger value="payments" className="gap-2 text-xs rounded-lg px-4">
              <CreditCard className="h-4 w-4" />
              تاریخچه پرداخت
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2 text-xs rounded-lg px-4">
              <Tag className="h-4 w-4" />
              کدهای تخفیف
            </TabsTrigger>
          </TabsList>
        </div>

        {/* تب اطلاعات */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-border/60 shadow-xs">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  مشخصات پایه و موقعیت مکانی
                </CardTitle>
                <CardDescription className="text-xs">اطلاعات رسمی، تماس و لوکیشن مرکز درمانی</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">نام کلینیک / مرکز درمانی</label>
                    <Input value={clinicName} onChange={(e) => setClinicName(e.target.value)} className="text-xs bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">نام و نام خانوادگی مدیر</label>
                    <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} className="text-xs bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">شماره تماس ثبت‌نام (مدیر)</label>
                    <Input value={registerPhone} onChange={(e) => setRegisterPhone(e.target.value)} dir="ltr" className="text-xs font-mono bg-muted/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">شماره تماس ثابت مطب / کلینیک</label>
                    <Input value={officePhone} onChange={(e) => setOfficePhone(e.target.value)} dir="ltr" className="text-xs font-mono bg-muted/30" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">آدرس کلینیک</label>
                    <CitySelector />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <label className="text-xs font-medium text-foreground">نشانی دقیق پستی</label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} className="text-xs bg-muted/30" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">آدرس وب‌سایت رسمی</label>
                  <Input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" className="text-xs font-mono bg-muted/30" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-semibold">لوگو و نشان تجاری</CardTitle>
                  <CardDescription className="text-xs">درج در سربرگ نسخ و پیامک‌ها</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                  <div className="h-32 w-32 rounded-2xl border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                    <Building2 className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <Button variant="outline" size="sm" className="text-xs">انتخاب تصویر جدید</Button>
                </CardContent>
              </div>
              <CardFooter className="border-t border-border/40 p-4 bg-muted/20 text-xs text-muted-foreground flex justify-between">
                <span>وضعیت پرونده:</span>
                <span className="font-medium text-emerald-600">تایید شده نظام پزشکی</span>
              </CardFooter>
            </Card>
          </div>

          {/* شبکه‌های اجتماعی */}
          <Card className="border-border/60 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                شبکه‌های اجتماعی و کانال‌های اطلاع‌رسانی
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="font-semibold text-xs text-pink-600">اینستاگرام</div>
                  <Input value={socials.instagram.handle} onChange={(e) => setSocials({ ...socials, instagram: { ...socials.instagram, handle: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="@username" />
                  <Input value={socials.instagram.phone} onChange={(e) => setSocials({ ...socials, instagram: { ...socials.instagram, phone: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="0912..." />
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="font-semibold text-xs text-sky-600">کانال تلگرام</div>
                  <Input value={socials.telegram.channel} onChange={(e) => setSocials({ ...socials, telegram: { ...socials.telegram, channel: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="@channel" />
                  <Input value={socials.telegram.phone} onChange={(e) => setSocials({ ...socials, telegram: { ...socials.telegram, phone: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="0912..." />
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="font-semibold text-xs text-emerald-600">پیام‌رسان بله</div>
                  <Input value={socials.bale.channel} onChange={(e) => setSocials({ ...socials, bale: { ...socials.bale, channel: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="ble.ir/channel" />
                  <Input value={socials.bale.phone} onChange={(e) => setSocials({ ...socials, bale: { ...socials.bale, phone: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="0912..." />
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <div className="font-semibold text-xs text-purple-600">کانال روبیکا</div>
                  <Input value={socials.rubika.channel} onChange={(e) => setSocials({ ...socials, rubika: { ...socials.rubika, channel: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="rubika.ir/channel" />
                  <Input value={socials.rubika.phone} onChange={(e) => setSocials({ ...socials, rubika: { ...socials.rubika, phone: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="0912..." />
                </div>

                <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20 space-y-2 md:col-span-2">
                  <div className="font-semibold text-xs text-amber-600">کانال ایتا</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Input value={socials.eitaa.channel} onChange={(e) => setSocials({ ...socials, eitaa: { ...socials.eitaa, channel: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="eitaa.com/channel" />
                    <Input value={socials.eitaa.phone} onChange={(e) => setSocials({ ...socials, eitaa: { ...socials.eitaa, phone: e.target.value } })} dir="ltr" className="text-xs font-mono h-8 bg-background" placeholder="0912..." />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* تب پلن‌ها و ماژول‌ها */}
        <TabsContent value="plans" className="space-y-6">
          <Card className="border-border/60 shadow-xs border-primary/20 bg-primary/5">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  اشتراک و پلن پایه فعال
                </CardTitle>
                <CardDescription className="text-xs">وضعیت لایسنس و سطح دسترسی مرکز</CardDescription>
              </div>
              <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
                {activePlan === "clinic" ? "پلن کلینیک تخصصی" : activePlan === "office" ? "پلن مطب" : "پلن رایگان"}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="p-3 rounded-lg bg-background border border-border/60">
                  <div className="text-xs text-muted-foreground">روزهای فعال باقیمانده</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">۱۴۵ روز</div>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border/60">
                  <div className="text-xs text-muted-foreground">ظرفیت کاربران و پزشکان</div>
                  <div className="text-2xl font-bold mt-1 text-foreground">۱۲ از ۲۰</div>
                </div>
                <div className="p-3 rounded-lg bg-background border border-border/60 flex flex-col justify-between">
                  <div className="text-xs text-muted-foreground">تغییر پلن</div>
                  <div className="flex gap-1.5 mt-2">
                    <Button size="sm" variant={activePlan === "clinic" ? "default" : "outline"} className="text-xs flex-1 h-8" onClick={() => setActivePlan("clinic")}>کلینیک</Button>
                    <Button size="sm" variant={activePlan === "office" ? "default" : "outline"} className="text-xs flex-1 h-8" onClick={() => setActivePlan("office")}>مطب</Button>
                    <Button size="sm" variant={activePlan === "trial" ? "default" : "outline"} className="text-xs flex-1 h-8" onClick={() => setActivePlan("trial")}>آزمایشی</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center"><HardDrive className="h-4 w-4" /></div>
                  <Switch checked={modules.storage.enabled} onCheckedChange={() => toggleModule("storage")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">فضای ذخیره‌سازی ابری</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2">
                <div className="text-xs font-medium">{modules.storage.usage}</div>
                <Progress value={65} className="h-1.5" />
              </CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />مدیریت سهمیه</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center"><MessageSquare className="h-4 w-4" /></div>
                  <Switch checked={modules.sms.enabled} onCheckedChange={() => toggleModule("sms")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">ماژول پیامک و OTP</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2">
                <div className="text-xs font-medium">{modules.sms.usage}</div>
                <Progress value={80} className="h-1.5" />
              </CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />شارژ و الگوها</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center"><Mic className="h-4 w-4" /></div>
                  <Switch checked={modules.voiceAssistant.enabled} onCheckedChange={() => toggleModule("voiceAssistant")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">دستیار صوتی AI</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2"><div className="text-xs font-medium">{modules.voiceAssistant.usage}</div></CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />تنظیمات صدا</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-pink-500/10 text-pink-600 flex items-center justify-center"><Bot className="h-4 w-4" /></div>
                  <Switch checked={modules.socialAssistant.enabled} onCheckedChange={() => toggleModule("socialAssistant")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">دستیار شبکه‌های اجتماعی</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2"><div className="text-xs font-medium">{modules.socialAssistant.usage}</div></CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />سناریوی ربات</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center"><Database className="h-4 w-4" /></div>
                  <Switch checked={modules.dataExport.enabled} onCheckedChange={() => toggleModule("dataExport")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">خروجی کامل داده‌ها</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2"><div className="text-xs font-medium">{modules.dataExport.usage}</div></CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><FileSpreadsheet className="h-3 w-3" />تنظیم خروجی</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center"><Calculator className="h-4 w-4" /></div>
                  <Switch checked={modules.commission.enabled} onCheckedChange={() => toggleModule("commission")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">کمیسیون و پرکیس</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2"><div className="text-xs font-medium">{modules.commission.usage}</div></CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />فرمول درصدها</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center"><Headphones className="h-4 w-4" /></div>
                  <Switch checked={modules.callCenter.enabled} onCheckedChange={() => toggleModule("callCenter")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">کال‌سنتر و ویپ ابری</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2"><div className="text-xs font-medium">{modules.callCenter.usage}</div></CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />تنظیمات سانترال</Button></CardFooter>
            </Card>

            <Card className="border-border/60 shadow-xs flex flex-col justify-between">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="h-8 w-8 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center"><BellRing className="h-4 w-4" /></div>
                  <Switch checked={modules.smartFollowup.enabled} onCheckedChange={() => toggleModule("smartFollowup")} />
                </div>
                <CardTitle className="text-sm font-semibold mt-2">پیگیری هوشمند درمان</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 space-y-2"><div className="text-xs font-medium">{modules.smartFollowup.usage}</div></CardContent>
              <CardFooter className="p-3 pt-0"><Button variant="outline" size="sm" className="w-full text-xs h-7 gap-1"><Sliders className="h-3 w-3" />تقویم سناریو</Button></CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* سایر تب‌ها */}
        <TabsContent value="tickets">
          <Card className="border-border/60 shadow-xs p-4 text-center text-xs text-muted-foreground">تیکت فعالی برای این مرکز ثبت نشده است.</Card>
        </TabsContent>
        <TabsContent value="logs">
          <Card className="border-border/60 shadow-xs p-4 text-center text-xs text-muted-foreground">تاریخچه مکالمات و پیامک‌های اخیر آماده نمایش است.</Card>
        </TabsContent>
        <TabsContent value="payments">
          <Card className="border-border/60 shadow-xs p-4 text-center text-xs text-muted-foreground">تراکنش‌های مالی و اشتراک‌ها ثبت شده‌اند.</Card>
        </TabsContent>
        <TabsContent value="discounts">
          <Card className="border-border/60 shadow-xs p-4 text-center text-xs text-muted-foreground">کدهای تخفیف فعال در دسترس است.</Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}