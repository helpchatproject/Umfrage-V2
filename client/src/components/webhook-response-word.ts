import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function generateWebhookResponseDoc(response: any, webhook: any) {
  const parsedData = JSON.parse(response.responseData);
  const formResponse = parsedData.form_response;

  const getAnswerText = (answer: any): string => {
    switch (answer.type) {
      case 'number':
        return answer.number?.toString() || 'N/A';
      case 'boolean':
      case 'yes_no':
        return answer.boolean ? 'Ja' : 'Nein';
      case 'choice':
        return answer.choice?.label?.replace(/\*/g, '') || 'N/A';
      case 'multiple_choice':
        return answer.choices?.map((c: any) => c.label.replace(/\*/g, '')).join(', ') || 'N/A';
      default:
        return answer[answer.type]?.toString() || 'N/A';
    }
  };

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "Webhook Antwort",
              bold: true,
              size: 32,
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun("")], // Empty line
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Webhook Name: ${webhook.name}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Typeform ID: ${webhook.typeformId}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Fall-Nummer: ${response.caseNumber}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `Datum: ${new Date(response.createdAt).toLocaleString('de-DE')}`,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun("")], // Empty line
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: "Antworten",
              bold: true,
              size: 28,
            }),
          ],
        }),
      ],
    }],
  });

  // Add answers
  formResponse.answers.forEach((answer: any) => {
    const question = formResponse.definition.fields.find(
      (field: any) => field.id === answer.field.id
    );

    const answerText = getAnswerText(answer);

    doc.addSection({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: question?.title?.replace(/\*/g, '') || 'Unbekannte Frage',
              bold: true,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: answerText,
              size: 24,
            }),
          ],
        }),
        new Paragraph({
          children: [new TextRun("")], // Empty line
        }),
      ],
    });
  });

  // Generate and return the document
  return await Packer.toBlob(doc);
}