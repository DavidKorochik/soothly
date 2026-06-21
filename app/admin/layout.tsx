// The admin tool is internal English chrome, so the shell opts out of the root's RTL — the
// multi-column data tables read left-to-right. Hebrew CONTENT cells re-enter RTL via dir="rtl".
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="ltr" className="mx-auto max-w-6xl px-6 py-12 font-sans">
      {children}
    </div>
  );
}
