import { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인 · PyDataLab",
  description: "PyDataLab 로그인 및 계정 관리",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
