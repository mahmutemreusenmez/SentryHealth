import { env } from './env.js';
import { CryptoAnonymizer } from '../anonymization/CryptoAnonymizer.js';
import { InMemoryPatientRepository } from '../persistence/InMemoryPatientRepository.js';
import { TurkishXAIReportGenerator } from '../ai/TurkishXAIReportGenerator.js';
import { LocalHealthAnalyzer } from '../ai/LocalHealthAnalyzer.js';
import { SubmitHealthData } from '../../application/use-cases/SubmitHealthData.js';
import { RecordPatientMetrics } from '../../application/use-cases/RecordPatientMetrics.js';
import { AnalyzeHealthData } from '../../application/use-cases/AnalyzeHealthData.js';
import { RegisterPatient } from '../../application/use-cases/RegisterPatient.js';

export const anonymizer = new CryptoAnonymizer(env.ANONYMIZATION_KEY);
export const repository = new InMemoryPatientRepository();
export const analyzer = new LocalHealthAnalyzer(new TurkishXAIReportGenerator());
export const submitUseCase = new SubmitHealthData(anonymizer, repository);
export const recordPatientMetrics = new RecordPatientMetrics(anonymizer, repository, analyzer);
export const analyzeUseCase = new AnalyzeHealthData(analyzer);
export const registerPatient = new RegisterPatient(anonymizer, repository);
