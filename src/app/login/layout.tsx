import { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 · UBION KDT DataLab",
  description: "UBION KDT DataLab 로그인 및 계정 관리",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
