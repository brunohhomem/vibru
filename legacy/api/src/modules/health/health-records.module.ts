import { Module } from '@nestjs/common';
import { CoupleModule } from '../couple/couple.module';
import { CoupleMemberGuard } from '../couple/couple-member.guard';
import { ListsModule } from '../lists/lists.module';
import { MedicationsModule } from '../medications/medications.module';
import { TasksModule } from '../tasks/tasks.module';
import { AllergiesRepository } from './allergies.repository';
import { AllergiesService } from './allergies.service';
import { DoctorsRepository } from './doctors.repository';
import { DoctorsService } from './doctors.service';
import { EmergencyContactsRepository } from './emergency-contacts.repository';
import { EmergencyContactsService } from './emergency-contacts.service';
import { HealthConditionsRepository } from './health-conditions.repository';
import { HealthConditionsService } from './health-conditions.service';
import { HealthEventsRepository } from './health-events.repository';
import { HealthEventsService } from './health-events.service';
import { HealthItemsController } from './health-items.controller';
import { HealthMembersController } from './health-members.controller';
import { HealthMembersService } from './health-members.service';
import { HealthMemberAccessService } from './health-member-access.service';
import { HealthProfileRepository } from './health-profile.repository';
import { HealthProfileService } from './health-profile.service';
import { HealthRecordController } from './health-record.controller';
import { HealthRecordService } from './health-record.service';
import { MedicationLifecycleService } from './medication-lifecycle.service';
import { MedicationsController } from './medications.controller';
import { PharmacyService } from './pharmacy.service';

@Module({
  imports: [CoupleModule, MedicationsModule, TasksModule, ListsModule],
  controllers: [
    HealthMembersController,
    HealthRecordController,
    HealthItemsController,
    MedicationsController,
  ],
  providers: [
    CoupleMemberGuard,
    HealthMemberAccessService,
    HealthProfileRepository,
    HealthProfileService,
    HealthRecordService,
    AllergiesRepository,
    AllergiesService,
    HealthConditionsRepository,
    HealthConditionsService,
    EmergencyContactsRepository,
    EmergencyContactsService,
    DoctorsRepository,
    DoctorsService,
    HealthEventsRepository,
    HealthEventsService,
    HealthMembersService,
    MedicationLifecycleService,
    PharmacyService,
  ],
})
export class HealthRecordsModule {}
