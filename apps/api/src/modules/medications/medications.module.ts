import { Module } from '@nestjs/common';
import { MedicationStockService } from './medication-stock.service';
import { MedicationsRepository } from './medications.repository';
import { MedicationsService } from './medications.service';

/**
 * Dados e estoque dos remédios. Fica abaixo de `tasks` e `health` para
 * quebrar a dependência circular: tasks desconta estoque, health cria tarefas.
 */
@Module({
  providers: [MedicationsRepository, MedicationsService, MedicationStockService],
  exports: [MedicationsService, MedicationStockService],
})
export class MedicationsModule {}
