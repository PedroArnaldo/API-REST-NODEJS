export class ValidateData {
  constructor(title, link, startAt, endAt) {
    this.title = title;
    this.link = link;
    this.startAt = startAt;
    this.endAt = endAt;
  }

  updateSummary(summary) {
    if (typeof summary !== "string") throw "Summary needs to be a string";
    this.summary = summary;
  }

  updateTranscript(transcript) {
    if (typeof transcript !== "string") throw "Text needs to be a string";
    this.transcript = transcript;
  }

  isValidInfo() {
    return (
      typeof this.title === "string" &&
      typeof this.link === "string" &&
      typeof this.startAt === "number" &&
      typeof this.endAt === "number" &&
      typeof this.summary === "string" &&
      typeof this.transcript === "string"
    );
  }
}
