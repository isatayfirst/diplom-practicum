"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Кнопка «назад» показывает главную из кэша истории Next, поэтому после показа
// данные запрашиваются заново. refresh не пересоздаёт компонент: цикла нет.
export default function RefreshOnReturn() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  }, [router]);

  return null;
}
