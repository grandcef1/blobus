// ARCHITECT: настоящий PDF отдаёт платёжный провайдер, поэтому квитанция сейчас — текстовый файл,
// собранный на клиенте. Объект URL освобождается сразу после клика: иначе blob висел бы в памяти до
// перезагрузки страницы.

export function downloadTextFile(fileName: string, content: string): void {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
