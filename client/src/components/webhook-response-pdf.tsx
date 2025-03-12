import { Document, Page, Text, View, StyleSheet, PDFViewer } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    width: '30%',
  },
  value: {
    fontSize: 12,
    width: '70%',
  },
  metadata: {
    fontSize: 10,
    color: '#666',
    marginBottom: 20,
  },
});

export const WebhookResponsePDF = ({ response, webhook }: { response: any, webhook: any }) => {
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

  return (
    <PDFViewer style={{ width: '100%', height: '100%' }}>
      <Document>
        <Page size="A4" style={styles.page}>
          <View style={styles.section}>
            <Text style={styles.title}>Webhook Antwort</Text>

            <Text style={styles.metadata}>
              Webhook Name: {webhook.name}{'\n'}
              Typeform ID: {webhook.typeformId}{'\n'}
              Fall-Nummer: {response.caseNumber}{'\n'}
              Datum: {new Date(response.createdAt).toLocaleString('de-DE')}
            </Text>

            <Text style={styles.subtitle}>Antworten</Text>
            {formResponse.answers.map((answer: any, index: number) => {
              const question = formResponse.definition.fields.find(
                (field: any) => field.id === answer.field.id
              );

              return (
                <View style={styles.row} key={index}>
                  <Text style={styles.label}>{question?.title?.replace(/\*/g, '')}</Text>
                  <Text style={styles.value}>
                    {getAnswerText(answer)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Page>
      </Document>
    </PDFViewer>
  );
};